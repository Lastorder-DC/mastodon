# frozen_string_literal: true

class Web::PushDmNotificationWorker
  include Sidekiq::Worker

  def perform(subscription_id, dm_message_id)
    subscription = Web::PushSubscription.find(subscription_id)
    message = DmMessage.includes(:account, :dm_chat_room).find(dm_message_id)

    payload = {
      title: "#{message.account.display_name.presence || message.account.username}",
      body: message.content_plain.truncate(140),
      icon: message.account.avatar.url(:original),
      tag: "dm-#{message.dm_chat_room.uuid}",
      data: {
        url: "/conversations/#{message.dm_chat_room.uuid}",
      },
    }

    subscription.push(payload)
  rescue ActiveRecord::RecordNotFound
    true
  rescue Web::PushSubscription::ExpiredSubscription, Web::PushSubscription::UndeliverableSubscription
    subscription&.destroy
  end
end
