# frozen_string_literal: true

class CreateCircles < ActiveRecord::Migration[7.0]
  def change
    create_table :circles do |t|
      t.belongs_to :account, null: false, foreign_key: { on_delete: :cascade }
      t.string :title, null: false, default: ''
      t.datetime :created_at, null: false
      t.datetime :updated_at, null: false
    end
    create_table :circle_accounts do |t|
      t.belongs_to :circle, null: true, foreign_key: { on_delete: :cascade }
      t.belongs_to :account, null: false, foreign_key: { on_delete: :cascade }
      t.belongs_to :follow, null: false, foreign_key: { on_delete: :cascade }
      t.datetime :created_at, null: false
      t.datetime :updated_at, null: false
    end

    add_index :circle_accounts, [:circle_id, :account_id], unique: true
  end
end
