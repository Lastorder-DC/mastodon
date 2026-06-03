# frozen_string_literal: true

class NotifyDmService < BaseService
  def call(recipient, dm_message)
    return if recipient.id == dm_message.account_id
    return if blocked?(recipient, dm_message.account)

    push_notification(recipient, dm_message)
  end

  private

  def blocked?(recipient, sender)
    Block.where(account: recipient, target_account: sender).exists? ||
      Block.where(account: sender, target_account: recipient).exists?
  end

  def push_notification(recipient, dm_message)
    return unless recipient.user

    Web::PushSubscription.where(user_id: recipient.user.id).find_each do |subscription|
      Web::PushDmNotificationWorker.perform_async(subscription.id, dm_message.id)
    end
  end
end
