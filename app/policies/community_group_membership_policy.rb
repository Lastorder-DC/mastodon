# frozen_string_literal: true

class CommunityGroupMembershipPolicy < ApplicationPolicy
  def index?
    record.member?(current_account) && !record.blocked?(current_account)
  end

  def update?
    record.admin?(current_account) && !record.blocked?(current_account)
  end

  def destroy?
    record.can_manage_members?(current_account)
  end
end
