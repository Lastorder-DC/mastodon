# frozen_string_literal: true

class OccmGroupCounterReconciliationWorker
  include Sidekiq::Worker

  sidekiq_options queue: 'pull', retry: 0

  def perform
    OccmGroup.find_each(batch_size: 200) do |group|
      actual_count = group.occm_group_memberships.where(state: :active).count
      group.update_column(:member_count, actual_count) if group.member_count != actual_count
    end
  end
end
