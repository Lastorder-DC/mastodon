# frozen_string_literal: true

class CreateDmMessages < ActiveRecord::Migration[8.0]
  def change
    create_table :dm_messages do |t|
      t.bigint :dm_chat_room_id, null: false
      t.bigint :account_id, null: false
      t.text :content, null: false, default: ''
      t.text :content_plain, default: ''
      t.bigint :in_reply_to_id
      t.bigint :status_id
      t.string :language
      t.boolean :hidden, null: false, default: false

      t.timestamps
    end

    add_index :dm_messages, [:dm_chat_room_id, :created_at]
    add_index :dm_messages, :account_id
    add_index :dm_messages, :status_id, where: 'status_id IS NOT NULL'
  end
end
