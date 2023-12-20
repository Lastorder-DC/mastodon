# frozen_string_literal: true

class AddGroupActivityPubCountToAccountStats < ActiveRecord::Migration[6.1]
  def change
    add_column :account_stats, :group_activitypub_count, :integer
  end
end
