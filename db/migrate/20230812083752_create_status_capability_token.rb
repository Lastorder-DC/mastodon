# frozen_string_literal: true

class CreateStatusCapabilityToken < ActiveRecord::Migration[7.0]
  def change
    create_table :status_capability_tokens do |t|
      t.belongs_to :status, null: false, foreign_key: { on_delete: :cascade }
      t.string :token
      t.datetime :created_at, null: false
      t.datetime :updated_at, null: false
    end
  end
end
