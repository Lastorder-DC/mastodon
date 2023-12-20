# frozen_string_literal: true

class AddStatusReferredByCountToStatusStats < ActiveRecord::Migration[6.1]
  def up
    safety_assured do
      add_column :status_stats, :status_referred_by_count, :integer, null: false, default: 0
    end
  end

  def down
    remove_column :status_stats, :status_referred_by_count
  end
end
