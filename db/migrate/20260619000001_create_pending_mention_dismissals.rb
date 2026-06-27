# frozen_string_literal: true

class CreatePendingMentionDismissals < ActiveRecord::Migration[8.0]
  def change
    create_table :pending_mention_dismissals do |t|
      t.bigint :account_id, null: false
      t.bigint :notification_id, null: false
      t.datetime :created_at, null: false
    end

    add_index :pending_mention_dismissals, [:account_id, :notification_id], unique: true, name: 'index_pending_mention_dismissals_on_account_and_notification'
    add_index :pending_mention_dismissals, :notification_id
  end
end
