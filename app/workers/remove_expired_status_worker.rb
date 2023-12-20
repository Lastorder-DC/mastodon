# frozen_string_literal: true

class RemoveExpiredStatusWorker
  include Sidekiq::Worker

  sidekiq_options lock: :until_executed

  def perform(scheduled_expiration_status_id)
    scheduled_expiration_status = ScheduledExpirationStatus.find(scheduled_expiration_status_id)
    scheduled_expiration_status.destroy!

    RemoveStatusService.new.call(scheduled_expiration_status.status)
  rescue ActiveRecord::RecordNotFound, ActiveRecord::RecordInvalid
    true
  end
end
