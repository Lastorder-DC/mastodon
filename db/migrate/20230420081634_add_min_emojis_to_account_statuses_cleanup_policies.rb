# frozen_string_literal: true

class AddMinEmojisToAccountStatusesCleanupPolicies < ActiveRecord::Migration[6.1]
  def change
    safety_assured do
      change_table :account_statuses_cleanup_policies, bulk: true do |t|
        t.integer :min_emojis
        t.boolean :keep_self_emoji, default: true, null: false
      end
    end
  end
end
