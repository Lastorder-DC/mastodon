# frozen_string_literal: true

class NotifyOccmGroupService < BaseService
  include Redisable

  def call(recipient, type, activity)
    @recipient = recipient
    @type = type
    @activity = activity

    return if @recipient.user.nil?

    @notification = Notification.create!(
      account: @recipient,
      type: @type,
      activity: @activity,
      from_account_id: from_account_id
    )

    push_to_streaming_api!
  end

  private

  def from_account_id
    case @activity
    when OccmGroupMembership, OccmGroupStatus
      @activity.account_id
    else
      @recipient.id
    end
  end

  def push_to_streaming_api!
    rendered = InlineRenderer.render(@notification, @recipient, :notification)
    redis.publish("timeline:#{@recipient.id}:notifications", JSON.generate(event: :notification, payload: rendered))
  end
end
