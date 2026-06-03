# frozen_string_literal: true

class DmChatRoomAccount < ApplicationRecord
  belongs_to :dm_chat_room
  belongs_to :account

  scope :active, -> { where(left_at: nil) }
  scope :unread, -> { where(unread: true) }
end
