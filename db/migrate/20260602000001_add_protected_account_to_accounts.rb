# frozen_string_literal: true

class AddProtectedAccountToAccounts < ActiveRecord::Migration[8.0]
  def change
    add_column :accounts, :protected_account, :boolean, default: false, null: false
  end
end
