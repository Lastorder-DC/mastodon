# frozen_string_literal: true

class OccmGroupPolicy < ApplicationPolicy
  def show?
    active_member?
  end

  def update?
    admin?
  end

  def destroy?
    admin?
  end

  def moderate?
    admin? || moderator?
  end

  def transfer?
    admin?
  end

  def post?
    active_member?
  end

  private

  def membership
    return @membership if defined?(@membership)

    @membership = record.occm_group_memberships.find_by(account: current_account, state: :active)
  end

  def active_member?
    membership.present?
  end

  def admin?
    membership&.role_admin?
  end

  def moderator?
    membership&.role_moderator?
  end
end
