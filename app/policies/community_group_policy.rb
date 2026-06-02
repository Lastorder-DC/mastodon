# frozen_string_literal: true

class CommunityGroupPolicy < ApplicationPolicy
  def show?
    record.member?(current_account) && !record.blocked?(current_account)
  end

  def create?
    current_account&.local?
  end

  def update?
    record.admin?(current_account) && !record.blocked?(current_account)
  end

  def destroy?
    update?
  end

  def transfer_ownership?
    update?
  end

  def join?
    current_account&.local? && !record.member?(current_account) && !record.blocked?(current_account)
  end

  def leave?
    record.member?(current_account) && !record.admin?(current_account)
  end

  def manage_members?
    record.can_manage_members?(current_account)
  end
end
