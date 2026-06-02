# frozen_string_literal: true

class CommunityGroup < ApplicationRecord
  SLUG_LENGTH = 24
  SHARE_TOKEN_LENGTH = 32

  belongs_to :owner_account, class_name: 'Account'

  has_many :memberships, class_name: 'CommunityGroupMembership', dependent: :destroy, inverse_of: :community_group
  has_many :member_accounts, through: :memberships, source: :account
  has_many :invitations, class_name: 'CommunityGroupInvitation', dependent: :destroy, inverse_of: :community_group
  has_many :join_requests, class_name: 'CommunityGroupJoinRequest', dependent: :destroy, inverse_of: :community_group
  has_many :account_blocks, class_name: 'CommunityGroupAccountBlock', dependent: :destroy, inverse_of: :community_group
  has_many :reports, class_name: 'CommunityGroupReport', dependent: :destroy, inverse_of: :community_group
  has_many :statuses, dependent: :nullify, inverse_of: :community_group

  validates :display_name, presence: true, length: { maximum: 100 }
  validates :note, length: { maximum: 500 }
  validates :slug, presence: true, uniqueness: true
  validates :share_token, presence: true, uniqueness: true

  before_validation :set_slug, on: :create
  before_validation :set_share_token, on: :create
  after_create :add_owner_membership

  def member?(account)
    account.present? && memberships.exists?(account: account)
  end

  def admin?(account)
    account.present? && memberships.admin.exists?(account: account)
  end

  def moderator?(account)
    account.present? && memberships.where(role: %i(admin moderator)).exists?(account: account)
  end

  def blocked?(account)
    account.present? && account_blocks.exists?(account: account)
  end

  def can_post?(account)
    member?(account) && !blocked?(account)
  end

  def can_manage_members?(account)
    moderator?(account) && !blocked?(account)
  end

  def transfer_ownership!(account)
    raise Mastodon::ValidationError, I18n.t('community_groups.errors.not_a_member') unless member?(account)
    raise Mastodon::ValidationError, I18n.t('community_groups.errors.blocked_account') if blocked?(account)

    ApplicationRecord.transaction do
      memberships.admin.where.not(account: account).update_all(role: CommunityGroupMembership.roles[:moderator], updated_at: Time.current)
      memberships.find_by!(account: account).update!(role: :admin)
      update!(owner_account: account)
    end
  end

  def rotate_share_token!
    update!(share_token: unique_token_for(:share_token, SHARE_TOKEN_LENGTH))
  end

  private

  def unique_token_for(attribute, length)
    loop do
      token = SecureRandom.base58(length)
      break token unless self.class.exists?(attribute => token)
    end
  end

  def set_slug
    self.slug ||= unique_token_for(:slug, SLUG_LENGTH)
  end

  def set_share_token
    self.share_token ||= unique_token_for(:share_token, SHARE_TOKEN_LENGTH)
  end

  def add_owner_membership
    memberships.find_or_create_by!(account: owner_account) do |membership|
      membership.role = :admin
    end
  end
end
