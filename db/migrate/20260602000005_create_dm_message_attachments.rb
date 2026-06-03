# frozen_string_literal: true

class CreateDmMessageAttachments < ActiveRecord::Migration[8.0]
  def change
    create_table :dm_message_attachments do |t|
      t.bigint :dm_message_id, null: false
      t.bigint :media_attachment_id, null: false

      t.timestamps
    end

    add_index :dm_message_attachments, :dm_message_id
    add_index :dm_message_attachments, :media_attachment_id
  end
end
