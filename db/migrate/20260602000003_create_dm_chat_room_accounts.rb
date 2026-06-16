# frozen_string_literal: true

class CreateDmChatRoomAccounts < ActiveRecord::Migration[8.0]
  def change
    create_table :dm_chat_room_accounts do |t|
      t.bigint :dm_chat_room_id, null: false
      t.bigint :account_id, null: false
      t.boolean :accepted, null: false, default: false
      t.boolean :unread, null: false, default: false
      t.bigint :last_read_message_id
      t.datetime :joined_at
      t.datetime :left_at

      t.timestamps
    end

    add_index :dm_chat_room_accounts, [:dm_chat_room_id, :account_id], unique: true, name: 'index_dm_room_accounts_unique'
    add_index :dm_chat_room_accounts, :account_id
    add_index :dm_chat_room_accounts, [:account_id, :unread]
  end
end
