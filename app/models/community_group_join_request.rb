# frozen_string_literal: true

class CommunityGroupJoinRequest < ApplicationRecord
  belongs_to :community_group, inverse_of: :join_requests
  belongs_to :account
  belongs_to :reviewed_by_account, class_name: 'Account', optional: true

  enum :status, { pending: 0, approved: 1, rejected: 2, cancelled: 3 }, validate: true

  validates :message, length: { maximum: 500 }
  validates :account_id, uniqueness: { scope: :community_group_id, conditions: -> { pending } }, if: :pending?
  validate :account_must_be_local
  validate :account_must_not_be_member, on: :create
  validate :account_must_not_be_blocked

  private

  def account_must_be_local
    errors.add(:account, I18n.t('community_groups.errors.local_accounts_only')) unless account&.local?
  end

  def account_must_not_be_member
    errors.add(:account, I18n.t('community_groups.errors.already_member')) if community_group&.member?(account)
  end

  def account_must_not_be_blocked
    errors.add(:account, I18n.t('community_groups.errors.blocked_account')) if community_group&.blocked?(account)
  end
end
