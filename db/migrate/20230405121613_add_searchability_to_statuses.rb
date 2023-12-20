# frozen_string_literal: true

class AddSearchabilityToStatuses < ActiveRecord::Migration[6.1]
  def change
    add_column :statuses, :searchability, :integer
  end
end
