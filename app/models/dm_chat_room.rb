# frozen_string_literal: true

class DmChatRoom < ApplicationRecord
  include Paginable

  UUID_REGEX = /\A[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\z/i

  belongs_to :owner_account, class_name: 'Account'
  has_many :dm_chat_room_accounts, dependent: :destroy
  has_many :accounts, through: :dm_chat_room_accounts
  has_many :dm_messages, dependent: :destroy

  enum :room_type, { direct: 0, group_chat: 1 }

  before_create :generate_uuid

  scope :active_for_account, ->(account) {
    joins(:dm_chat_room_accounts)
      .where(dm_chat_room_accounts: { account_id: account.id, left_at: nil })
  }

  scope :ordered, -> { order(last_message_at: :desc) }

  def self.find_by_uuid_or_id(identifier)
    if identifier.to_s.match?(UUID_REGEX)
      find_by!(uuid: identifier)
    else
      find(identifier)
    end
  end

  private

  def generate_uuid
    self.uuid = SecureRandom.uuid if uuid.blank?
  end
end
