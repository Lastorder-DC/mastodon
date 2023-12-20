# frozen_string_literal: true

class AddGroupMessageFollowingOnlyToAccounts < ActiveRecord::Migration[6.1]
  def change
    add_column :accounts, :group_message_following_only, :boolean
  end
end
