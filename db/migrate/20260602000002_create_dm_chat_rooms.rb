# frozen_string_literal: true

class CreateDmChatRooms < ActiveRecord::Migration[8.0]
  def change
    create_table :dm_chat_rooms do |t|
      t.bigint :owner_account_id, null: false
      t.string :title, default: ''
      t.integer :room_type, null: false, default: 0
      t.datetime :last_message_at

      t.timestamps
    end

    add_index :dm_chat_rooms, :owner_account_id
    add_index :dm_chat_rooms, :last_message_at
  end
end
