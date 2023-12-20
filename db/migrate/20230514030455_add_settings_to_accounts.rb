# frozen_string_literal: true

class AddSettingsToAccounts < ActiveRecord::Migration[6.1]
  def change
    add_column :accounts, :settings, :jsonb
  end
end
