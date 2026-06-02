# frozen_string_literal: true

class CommunityGroupMembership < ApplicationRecord
  belongs_to :community_group, counter_cache: :members_count, inverse_of: :memberships
  belongs_to :account

  enum :role, { member: 0, moderator: 1, admin: 2 }, validate: true

  validates :account_id, uniqueness: { scope: :community_group_id }
  validate :account_must_be_local
  validate :account_must_not_be_blocked
  validate :single_admin

  private

  def account_must_be_local
    errors.add(:account, I18n.t('community_groups.errors.local_accounts_only')) unless account&.local?
  end

  def account_must_not_be_blocked
    errors.add(:account, I18n.t('community_groups.errors.blocked_account')) if community_group&.blocked?(account)
  end

  def single_admin
    return unless admin? && community_group.present?

    existing_admins = community_group.memberships.admin
    existing_admins = existing_admins.where.not(id: id) if persisted?
    errors.add(:role, I18n.t('community_groups.errors.single_admin')) if existing_admins.exists?
  end
end
