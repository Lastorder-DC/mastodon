# frozen_string_literal: true

class AddLimitedScopeToStatuses < ActiveRecord::Migration[7.0]
  def change
    add_column :statuses, :limited_scope, :integer
  end
end
