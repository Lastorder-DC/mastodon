# frozen_string_literal: true

class REST::DmChatRoomSerializer < ActiveModel::Serializer
  attributes :id, :uuid, :room_type, :title, :last_message_at, :unread, :accepted, :created_at, :read_receipts

  has_one :owner_account, key: :owner, serializer: REST::AccountSerializer
  has_many :participants, serializer: REST::AccountSerializer
  has_one :last_message, serializer: REST::DmMessageSerializer

  def id
    object.id.to_s
  end

  def participants
    object.dm_chat_room_accounts.active.map(&:account)
  end

  def last_message
    object.dm_messages.visible.reverse_ordered.first
  end

  def unread
    return false unless current_account

    current_membership&.unread || false
  end

  def accepted
    return true unless current_account

    current_membership&.accepted == true
  end

  def last_message_at
    object.last_message_at&.iso8601
  end

  def created_at
    object.created_at.iso8601
  end

  def read_receipts
    object.dm_chat_room_accounts.select { |m| m.left_at.nil? && m.last_read_message_id.present? }.map do |membership|
      {
        account_id: membership.account_id.to_s,
        last_read_message_id: membership.last_read_message_id.to_s,
      }
    end
  end

  private

  def current_membership
    @current_membership ||= current_account ? object.dm_chat_room_accounts.find_by(account: current_account) : nil
  end

  def current_account
    scope&.account
  end
end
