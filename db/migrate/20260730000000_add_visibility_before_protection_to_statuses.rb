# frozen_string_literal: true

class AddVisibilityBeforeProtectionToStatuses < ActiveRecord::Migration[8.1]
  def change
    add_column :statuses, :visibility_before_protection, :integer
  end
end
