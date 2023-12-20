# frozen_string_literal: true

class AddRejectFavouriteToDomainBlocks < ActiveRecord::Migration[6.1]
  def change
    safety_assured do
      change_table :domain_blocks, bulk: true do |t|
        t.boolean :reject_favourite, null: false, default: false
        t.boolean :reject_reply, null: false, default: false
      end
    end
  end
end
