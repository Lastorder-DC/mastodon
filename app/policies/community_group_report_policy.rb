# frozen_string_literal: true

class CommunityGroupReportPolicy < ApplicationPolicy
  def index?
    record.can_manage_members?(current_account)
  end

  def show?
    record.account_id == current_account&.id || record.community_group.can_manage_members?(current_account)
  end

  def create?
    record.community_group.can_post?(current_account)
  end

  def resolve?
    record.community_group.can_manage_members?(current_account)
  end

  alias unresolve? resolve?
end
