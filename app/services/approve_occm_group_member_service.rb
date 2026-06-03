# frozen_string_literal: true

class ApproveOccmGroupMemberService < BaseService
  def call(occm_group, account_id)
    @group = occm_group
    @membership = @group.occm_group_memberships.where(state: :pending).find_by!(account_id: account_id)

    @membership.update!(state: :active)
    @group.increment!(:member_count)

    NotifyOccmGroupService.new.call(@membership.account, :occm_group_join_approved, @membership)

    @membership
  end
end
