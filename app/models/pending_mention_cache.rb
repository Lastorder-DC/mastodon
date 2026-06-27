# frozen_string_literal: true

class PendingMentionCache
  include Redisable

  CACHE_KEY_PREFIX = 'pending_mentions'
  LOCK_KEY_PREFIX = 'pending_mentions_lock'
  EXTENDED_KEY_PREFIX = 'pending_mentions_extended'
  TTL = 14.days.to_i
  LOCK_TTL = 60 # seconds
  SCAN_LIMIT = 800

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
          .limit(SCAN_LIMIT)

        # Collect all status IDs for batch queries
        notification_status_map = {}
        notifications.each do |notification|
          status = notification.target_status
          next if status.nil?

          notification_status_map[notification.id] = status.id
        end

        return if notification_status_map.empty?

        status_ids = notification_status_map.values

        # Batch query: find all notifications dismissed by this account
        dismissed_notification_ids = PendingMentionDismissal.where(account_id: account_id, notification_id: notification_status_map.keys).pluck(:notification_id).to_set

        # Batch query: find all statuses already favourited by this account
        favourited_status_ids = Favourite.where(account: account, status_id: status_ids).pluck(:status_id).to_set

        # Batch query: find all statuses already replied to by this account
        replied_status_ids = Status.where(account: account, in_reply_to_id: status_ids).pluck(:in_reply_to_id).to_set

        notification_status_map.each do |notification_id, status_id|
          next if dismissed_notification_ids.include?(notification_id)
          next if favourited_status_ids.include?(status_id)
          next if replied_status_ids.include?(status_id)

          add(account_id, notification_id)
        end
      ensure
        redis.del(lock_key)
      end
    end

    def extend(account_id)
      # Only extend once per cache lifetime
      return false if extended?(account_id)

      lock_key = "#{LOCK_KEY_PREFIX}:extend:#{account_id}"
      return false unless redis.set(lock_key, 1, nx: true, ex: LOCK_TTL)

      begin
        account = Account.find(account_id)

        notifications = Notification.where(account_id: account_id, type: :mention)
          .where(filtered: false)
          .includes(mention: :status)
          .order(id: :desc)
          .offset(SCAN_LIMIT)
          .limit(SCAN_LIMIT)

        notification_status_map = {}
        notifications.each do |notification|
          status = notification.target_status
          next if status.nil?

          notification_status_map[notification.id] = status.id
        end

        if notification_status_map.any?
          status_ids = notification_status_map.values

          # Batch query: find all notifications dismissed by this account
          dismissed_notification_ids = PendingMentionDismissal.where(account_id: account_id, notification_id: notification_status_map.keys).pluck(:notification_id).to_set

          favourited_status_ids = Favourite.where(account: account, status_id: status_ids).pluck(:status_id).to_set
          replied_status_ids = Status.where(account: account, in_reply_to_id: status_ids).pluck(:in_reply_to_id).to_set

          notification_status_map.each do |notification_id, status_id|
            next if dismissed_notification_ids.include?(notification_id)
            next if favourited_status_ids.include?(status_id)
            next if replied_status_ids.include?(status_id)

            add(account_id, notification_id)
          end
        end

        # Mark as extended
        redis.set(extended_key(account_id), 1, ex: TTL)
        true
      ensure
        redis.del(lock_key)
      end
    end

    def extended?(account_id)
      redis.exists?(extended_key(account_id))
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

    def extended_key(account_id)
      "#{EXTENDED_KEY_PREFIX}:#{account_id}"
    end
  end
end
