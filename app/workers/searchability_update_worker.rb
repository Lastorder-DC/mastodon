# frozen_string_literal: true

class SearchabilityUpdateWorker
  include Sidekiq::Worker

  sidekiq_options queue: 'pull', lock: :until_executed

  def perform(account_id)
    SearchabilityUpdateService.new.call(Account.find(account_id))
  rescue ActiveRecord::RecordNotFound
    true
  end
end
