# frozen_string_literal: true

class AddGroupAllowPrivateMessageToAccounts < ActiveRecord::Migration[6.1]
  def change
    add_column :accounts, :group_allow_private_message, :boolean
  end
end
