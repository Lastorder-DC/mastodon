# frozen_string_literal: true

class CommunityGroupJoinRequestPolicy < ApplicationPolicy
  def index?
    record.can_manage_members?(current_account)
  end

  def authorize?
    record.can_manage_members?(current_account)
  end

  def reject?
    record.can_manage_members?(current_account)
  end
end
