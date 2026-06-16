# frozen_string_literal: true

class AddForceCustomBrandingToInvitesAndAccounts < ActiveRecord::Migration[8.0]
  def change
    add_column :invites, :force_custom_branding, :boolean, default: false, null: false
    add_column :accounts, :custom_branding_source_account_id, :bigint, null: true
  end
end
