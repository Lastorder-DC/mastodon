# frozen_string_literal: true

class ChangeSearchabilityDefaultValue < ActiveRecord::Migration[6.1]
  def change
    change_column_default :accounts, :searchability, from: 0, to: 2
  end
end
