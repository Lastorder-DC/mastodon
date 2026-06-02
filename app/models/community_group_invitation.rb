# frozen_string_literal: true

class CommunityGroupInvitation < ApplicationRecord
  TOKEN_LENGTH = 32

  belongs_to :community_group, inverse_of: :invitations
  belongs_to :inviter_account, class_name: 'Account'
  belongs_to :invitee_account, class_name: 'Account'

  enum :status, { pending: 0, accepted: 1, rejected: 2, revoked: 3, expired: 4 }, validate: true

  validates :token, presence: true, uniqueness: true
  validate :invitee_must_be_local
  validate :invitee_must_not_be_member, on: :create
  validate :invitee_must_not_be_blocked

  before_validation :set_token, on: :create

  def expired?
    expires_at.present? && expires_at.past?
  end

  private

  def unique_token_for(attribute, length)
    loop do
      token = SecureRandom.base58(length)
      break token unless self.class.exists?(attribute => token)
    end
  end

  def set_token
    self.token ||= unique_token_for(:token, TOKEN_LENGTH)
  end

  def invitee_must_be_local
    errors.add(:invitee_account, I18n.t('community_groups.errors.local_accounts_only')) unless invitee_account&.local?
  end

  def invitee_must_not_be_member
    errors.add(:invitee_account, I18n.t('community_groups.errors.already_member')) if community_group&.member?(invitee_account)
  end

  def invitee_must_not_be_blocked
    errors.add(:invitee_account, I18n.t('community_groups.errors.blocked_account')) if community_group&.blocked?(invitee_account)
  end
end
