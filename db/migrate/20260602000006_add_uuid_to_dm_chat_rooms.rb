# frozen_string_literal: true

class AddUuidToDmChatRooms < ActiveRecord::Migration[8.0]
  def up
    add_column :dm_chat_rooms, :uuid, :string

    DmChatRoom.reset_column_information
    DmChatRoom.find_each do |room|
      room.update_column(:uuid, SecureRandom.uuid)
    end

    safety_assured do
      change_column_null :dm_chat_rooms, :uuid, false
      add_index :dm_chat_rooms, :uuid, unique: true
    end
  end

  def down
    remove_index :dm_chat_rooms, :uuid
    remove_column :dm_chat_rooms, :uuid
  end
end
