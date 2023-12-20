# frozen_string_literal: true

require Rails.root.join('lib', 'mastodon', 'migration_helpers')

class CreateBookmarkCategories < ActiveRecord::Migration[7.0]
  include Mastodon::MigrationHelpers

  disable_ddl_transaction!

  def change
    create_table :bookmark_categories do |t|
      t.belongs_to :account, null: false, foreign_key: { on_delete: :cascade }
      t.string :title, null: false, default: ''
      t.datetime :created_at, null: false
      t.datetime :updated_at, null: false
    end
    create_table :bookmark_category_statuses do |t|
      t.belongs_to :bookmark_category, null: false, foreign_key: { on_delete: :cascade }
      t.belongs_to :status, null: false, foreign_key: { on_delete: :cascade }
      t.belongs_to :bookmark, null: true, foreign_key: { on_delete: :cascade }
      t.datetime :created_at, null: false
      t.datetime :updated_at, null: false
    end

    add_index :bookmark_category_statuses, [:bookmark_category_id, :status_id], unique: true, algorithm: :concurrently, name: 'index_bc_statuses'
  end
end
