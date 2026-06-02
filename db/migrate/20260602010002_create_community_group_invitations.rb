# frozen_string_literal: true

class CreateCommunityGroupInvitations < ActiveRecord::Migration[8.1]
  def change
    create_table :community_group_invitations do |t|
      t.references :community_group, null: false, foreign_key: { on_delete: :cascade }, index: false
      t.references :inviter_account, null: false, foreign_key: { to_table: :accounts }, index: true
      t.references :invitee_account, null: false, foreign_key: { to_table: :accounts }, index: true
      t.string :token, null: false
      t.integer :status, null: false, default: 0
      t.datetime :expires_at

      t.timestamps
    end

    add_index :community_group_invitations, [:community_group_id, :invitee_account_id, :status], name: 'idx_community_group_invitations_on_group_invitee_status'
    add_index :community_group_invitations, :token, unique: true
  end
end
