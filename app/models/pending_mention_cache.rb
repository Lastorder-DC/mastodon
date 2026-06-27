# frozen_string_literal: true

class PendingMentionCache
  include Redisable

  CACHE_KEY_PREFIX = 'pending_mentions'

  class << self
    include Redisable

    def add(account_id, notification_id)
      redis.zadd(key(account_id), notification_id, notification_id)
    end

    def remove(account_id, notification_id)
      redis.zrem(key(account_id), notification_id)
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
      account = Account.find(account_id)

      notifications = Notification.where(account_id: account_id, type: :mention)
                                  .where(filtered: false)
                                  .includes(mention: :status)
                                  .order(id: :desc)
                                  .limit(800)

      notifications.each do |notification|
        status = notification.target_status
        next if status.nil?

        # Skip if the account has already favourited this status
        next if Favourite.exists?(account: account, status: status)

        # Skip if the account has already replied to this status
        next if Status.exists?(account: account, in_reply_to_id: status.id)

        add(account_id, notification.id)
      end
    end

    private

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
