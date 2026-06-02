# frozen_string_literal: true

class CreateCommunityGroups < ActiveRecord::Migration[8.1]
  def change
    create_table :community_groups do |t|
      t.references :owner_account, null: false, foreign_key: { to_table: :accounts }, index: true
      t.string :display_name, null: false, default: ''
      t.text :note, null: false, default: ''
      t.string :slug, null: false
      t.string :share_token, null: false
      t.boolean :locked, null: false, default: false
      t.boolean :discoverable, null: false, default: false
      t.integer :members_count, null: false, default: 0
      t.integer :statuses_count, null: false, default: 0
      t.datetime :last_status_at

      t.timestamps
    end

    add_index :community_groups, :slug, unique: true
    add_index :community_groups, :share_token, unique: true
    add_index :community_groups, :discoverable
  end
end
