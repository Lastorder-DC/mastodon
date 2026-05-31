# frozen_string_literal: true

module MultiAccounts
  class StateStore
    include Redisable

    KEY_PREFIX = 'multi_account:state:'
    TTL = 15.minutes
    FAILURE_TTL = 1.minute

    class InvalidStateError < StandardError; end

    class << self
      def store!(state:, nonce:, user_id:, redirect_uri:)
        data = {
          nonce: nonce,
          user_id: user_id,
          redirect_uri: redirect_uri,
          created_at: Time.now.utc.iso8601,
          force_login_performed: false,
        }
        new.store_state(state, data)
      end

      def fetch(state)
        new.fetch_state(state)
      end

      def consume!(state, nonce)
        new.consume_state!(state, nonce)
      end

      def mark_force_login!(state)
        new.mark_force_login_state!(state)
      end
    end

    def store_state(state, data)
      with_redis do |redis|
        redis.setex("#{KEY_PREFIX}#{state}", TTL.to_i, data.to_json)
      end
    end

    def fetch_state(state)
      with_redis do |redis|
        raw = redis.get("#{KEY_PREFIX}#{state}")
        return nil if raw.blank?

        JSON.parse(raw).with_indifferent_access
      end
    end

    def consume_state!(state, nonce)
      data = fetch_state(state)

      if data.blank? || data[:nonce] != nonce
        with_redis do |redis|
          redis.expire("#{KEY_PREFIX}#{state}", FAILURE_TTL.to_i) if data.present?
        end
        raise InvalidStateError, 'Invalid state or nonce'
      end

      with_redis do |redis|
        redis.del("#{KEY_PREFIX}#{state}")
      end
      data
    end

    def mark_force_login_state!(state)
      with_redis do |redis|
        key = "#{KEY_PREFIX}#{state}"
        raw = redis.get(key)
        return nil if raw.blank?

        ttl = redis.ttl(key)
        ttl = TTL.to_i if ttl.nil? || ttl.negative?

        data = JSON.parse(raw)
        data['force_login_performed'] = true
        redis.setex(key, ttl, data.to_json)

        data.with_indifferent_access
      end
    end
  end
end
