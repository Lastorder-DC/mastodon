# frozen_string_literal: true

class CommunityGroupInvitationPolicy < ApplicationPolicy
  def index?
    record.can_manage_members?(current_account)
  end

  def create?
    record.can_manage_members?(current_account)
  end

  def destroy?
    record.can_manage_members?(current_account)
  end
end
