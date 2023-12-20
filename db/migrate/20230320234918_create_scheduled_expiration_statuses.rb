# frozen_string_literal: true

class CreateScheduledExpirationStatuses < ActiveRecord::Migration[6.1]
  def change
    create_table :scheduled_expiration_statuses do |t|
      t.belongs_to :account, foreign_key: { on_delete: :cascade }
      t.belongs_to :status, null: false, foreign_key: { on_delete: :cascade }
      t.datetime :scheduled_at, index: true

      t.datetime :created_at, null: false
      t.datetime :updated_at, null: false
    end
  end
end
