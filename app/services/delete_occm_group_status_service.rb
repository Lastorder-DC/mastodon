# frozen_string_literal: true

class DeleteOccmGroupStatusService < BaseService
  include Redisable

  def call(occm_group, status, current_account)
    @group = occm_group
    @status = status
    @current_account = current_account

    @group_status = @group.occm_group_statuses.find_by!(status: @status)
    author = @status.account

    @group_status.destroy!
    @status.destroy!

    notify_author!(author) if author.id != @current_account.id

    publish_delete_event!
  end

  private

  def notify_author!(author)
    NotifyOccmGroupService.new.call(author, :occm_group_post_deleted, @group_status)
  end

  def publish_delete_event!
    redis.publish("timeline:occm_group:#{@group.id}", JSON.generate(event: :delete, payload: @status.id.to_s))
  end
end
