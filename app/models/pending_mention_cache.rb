# frozen_string_literal: true

class PendingMentionCache
  include Redisable

  CACHE_KEY_PREFIX = 'pending_mentions'
  LOCK_KEY_PREFIX = 'pending_mentions_lock'
  TTL = 14.days.to_i
  LOCK_TTL = 60 # seconds

  class << self
    include Redisable

    def add(account_id, notification_id)
      redis.zadd(key(account_id), notification_id, notification_id)
      refresh_ttl(account_id)
    end

    def remove(account_id, notification_id)
      redis.zrem(key(account_id), notification_id)
    end

    def clear_for_account(account_id)
      redis.del(key(account_id))
    end

    def exists?(account_id, notification_id)
      redis.zscore(key(account_id), notification_id).present?
    end

    def get(account_id, limit, max_id = nil, since_id = nil, min_id = nil)
      limit    = limit.to_i
      max_id   = max_id.to_i if max_id.present?
      since_id = since_id.to_i if since_id.present?
      min_id   = min_id.to_i if min_id.present?

      from_redis(account_id, limit, max_id, since_id, min_id)
    end

    def count(account_id)
      redis.zcard(key(account_id))
    end

    def populate(account_id)
      # Use a Redis lock to prevent concurrent population
      lock_key = "#{LOCK_KEY_PREFIX}:#{account_id}"
      return unless redis.set(lock_key, 1, nx: true, ex: LOCK_TTL)

      begin
        account = Account.find(account_id)

        notifications = Notification.where(account_id: account_id, type: :mention)
          .where(filtered: false)
          .includes(mention: :status)
          .order(id: :desc)
          .limit(800)

        # Collect all status IDs for batch queries
        notification_status_map = {}
        notifications.each do |notification|
          status = notification.target_status
          next if status.nil?

          notification_status_map[notification.id] = status.id
        end

        return if notification_status_map.empty?

        status_ids = notification_status_map.values

        # Batch query: find all statuses already favourited by this account
        favourited_status_ids = Favourite.where(account: account, status_id: status_ids).pluck(:status_id).to_set

        # Batch query: find all statuses already replied to by this account
        replied_status_ids = Status.where(account: account, in_reply_to_id: status_ids).pluck(:in_reply_to_id).to_set

        notification_status_map.each do |notification_id, status_id|
          next if favourited_status_ids.include?(status_id)
          next if replied_status_ids.include?(status_id)

          add(account_id, notification_id)
        end
      ensure
        redis.del(lock_key)
      end
    end

    private

    def refresh_ttl(account_id)
      redis.expire(key(account_id), TTL)
    end

    def from_redis(account_id, limit, max_id, since_id, min_id)
      max_id = '+inf' if max_id.blank?
      if min_id.blank?
        since_id = '-inf' if since_id.blank?
        redis.zrevrangebyscore(key(account_id), "(#{max_id}", "(#{since_id}", limit: [0, limit]).map(&:to_i)
      else
        redis.zrangebyscore(key(account_id), "(#{min_id}", "(#{max_id}", limit: [0, limit]).map(&:to_i)
      end
    end

    def key(account_id)
      "#{CACHE_KEY_PREFIX}:#{account_id}"
    end
  end
end
