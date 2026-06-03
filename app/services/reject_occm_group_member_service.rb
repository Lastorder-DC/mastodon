# frozen_string_literal: true

class RejectOccmGroupMemberService < BaseService
  def call(occm_group, account_id)
    @group = occm_group
    @membership = @group.occm_group_memberships.where(state: :pending).find_by!(account_id: account_id)

    @membership.update!(state: :rejected)

    NotifyOccmGroupService.new.call(@membership.account, :occm_group_join_rejected, @membership)

    @membership
  end
end
