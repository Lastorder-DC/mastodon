# frozen_string_literal: true

class AddApiRateLimitBoostToUserRoles < ActiveRecord::Migration[8.1]
  def change
    add_column :user_roles, :api_rate_limit_boost, :boolean, null: false, default: false
  end
end
