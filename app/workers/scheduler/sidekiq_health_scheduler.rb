# frozen_string_literal: true

class Scheduler::SidekiqHealthScheduler
  include Sidekiq::Worker

  sidekiq_options retry: 0, lock: :until_executed, lock_ttl: 15.seconds.to_i

  def perform
    url = ENV.fetch('SIDEKIQ_HEALTH_FETCH_URL', nil)
    Request.new(:head, url).perform if url.present?
  end
end
