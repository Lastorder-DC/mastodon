# frozen_string_literal: true

class RemoveGroupMessageFollowingOnlyFromAccounts < ActiveRecord::Migration[6.1]
  disable_ddl_transaction!

  def change
    safety_assured { remove_column :accounts, :group_message_following_only, :boolean }
  end
end
