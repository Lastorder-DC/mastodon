# frozen_string_literal: true

class FavouriteService < BaseService
  include Authorization
  include Payloadable

  # Favourite a status and notify remote user
  # @param [Account] account
  # @param [Status] status
  # @return [Favourite]
  def call(account, status)
    authorize_with account, status, :favourite?

    favourite = Favourite.find_by(account: account, status: status)

    return favourite unless favourite.nil?

    favourite = Favourite.create!(account: account, status: status)

    Trends.statuses.register(status)

    create_notification(favourite)
    increment_statistics
    remove_from_pending_mentions!(account, status)

    favourite
  end

  private

  def create_notification(favourite)
    status = favourite.status

    if status.account.local?
      LocalNotificationWorker.perform_async(status.account_id, favourite.id, 'Favourite', 'favourite')
    elsif status.account.activitypub?
      ActivityPub::DeliveryWorker.perform_async(build_json(favourite), favourite.account_id, status.account.inbox_url)
    end
  end

  def increment_statistics
    ActivityTracker.increment('activity:interactions')
  end

  def build_json(favourite)
    serialize_payload(favourite, ActivityPub::LikeSerializer).to_json
  end

  def remove_from_pending_mentions!(account, status)
    mention = Mention.find_by(account: account, status: status, silent: false)
    return unless mention

    notification = Notification.find_by(account: account, activity_type: 'Mention', activity_id: mention.id, type: :mention)
    return unless notification

    PendingMentionCache.remove(account.id, notification.id)
  end
end
