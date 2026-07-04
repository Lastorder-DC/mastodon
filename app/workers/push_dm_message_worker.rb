# frozen_string_literal: true

class PushDmMessageWorker
  include Sidekiq::Worker
  include Redisable

  def perform(dm_message_id)
    message   = DmMessage.find(dm_message_id)
    chat_room = message.dm_chat_room
    sender_id = message.account_id
    payload   = InlineRenderer.render(message, nil, :dm_message)

    blocked_ids = blocked_account_ids(sender_id, chat_room)

    chat_room.dm_chat_room_accounts.active.includes(:account).find_each do |membership|
      next if blocked_ids.include?(membership.account_id)

      timeline_id = "timeline:dm:#{membership.account_id}"
      redis.publish(timeline_id, { event: :dm_message, payload: payload }.to_json)

      NotifyDmService.new.call(membership.account, message) unless membership.account_id == sender_id
    end
  rescue ActiveRecord::RecordNotFound
    true
  end

  private

  def blocked_account_ids(sender_id, chat_room)
    participant_ids = chat_room.dm_chat_room_accounts.active.pluck(:account_id) - [sender_id]

    blocked_by_sender = Block.where(account_id: sender_id, target_account_id: participant_ids).pluck(:target_account_id)
    blocked_sender = Block.where(account_id: participant_ids, target_account_id: sender_id).pluck(:account_id)

    (blocked_by_sender + blocked_sender).uniq
  end
end
