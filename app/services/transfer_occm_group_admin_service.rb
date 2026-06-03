# frozen_string_literal: true

class TransferOccmGroupAdminService < BaseService
  def call(occm_group, target_account_id)
    @group = occm_group
    @target_membership = @group.occm_group_memberships.where(state: :active).find_by!(account_id: target_account_id)

    ApplicationRecord.transaction do
      @group.lock!

      former_admin_membership = @group.occm_group_memberships.find_by!(account_id: @group.account_id)
      @target_membership.update!(role: :admin)
      former_admin_membership.update!(role: :user)
      @group.update!(account_id: target_account_id)
    end

    @group
  end
end
