# frozen_string_literal: true

class Api::V1::Dm::UnreadController < Api::BaseController
  include Redisable

  before_action -> { doorkeeper_authorize! :read, :'read:dm' }
  before_action :require_user!

  CACHE_TTL = 60 # seconds

  def count
    cached = redis.get(cache_key)

    if cached
      render json: { count: cached.to_i }
    else
      unread_count = DmChatRoomAccount
        .where(account: current_account, left_at: nil, unread: true)
        .count
      redis.set(cache_key, unread_count.to_s, ex: CACHE_TTL)
      render json: { count: unread_count }
    end
  end

  private

  def cache_key
    "dm:unread:#{current_account.id}"
  end
end
