# frozen_string_literal: true

class CommunityGroupAccountBlock < ApplicationRecord
  belongs_to :community_group, inverse_of: :account_blocks
  belongs_to :account
  belongs_to :blocked_by_account, class_name: 'Account'

  validates :account_id, uniqueness: { scope: :community_group_id }
  validates :reason, length: { maximum: 500 }
  validate :account_must_be_local

  after_commit :remove_group_access, on: :create

  private

  def account_must_be_local
    errors.add(:account, I18n.t('community_groups.errors.local_accounts_only')) unless account&.local?
  end

  def remove_group_access
    community_group.memberships.where(account: account).destroy_all
    community_group.invitations.pending.where(invitee_account: account).update_all(status: CommunityGroupInvitation.statuses[:revoked], updated_at: Time.current)
    community_group.join_requests.pending.where(account: account).update_all(status: CommunityGroupJoinRequest.statuses[:rejected], reviewed_by_account_id: blocked_by_account_id, reviewed_at: Time.current, updated_at: Time.current)
  end
end
