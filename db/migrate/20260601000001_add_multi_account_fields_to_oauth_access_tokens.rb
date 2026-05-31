# frozen_string_literal: true

class AddMultiAccountFieldsToOAuthAccessTokens < ActiveRecord::Migration[8.0]
  disable_ddl_transaction!

  def up
    unless column_exists?(:oauth_access_tokens, :multi_account)
      add_column :oauth_access_tokens, :multi_account, :boolean, default: false, null: false
    end

    unless column_exists?(:oauth_access_tokens, :long_lived)
      add_column :oauth_access_tokens, :long_lived, :boolean, default: false, null: false
    end

    unless column_exists?(:oauth_access_tokens, :purpose)
      add_column :oauth_access_tokens, :purpose, :string, limit: 50
    end

    unless index_exists?(:oauth_access_tokens, :multi_account)
      add_index :oauth_access_tokens, :multi_account, algorithm: :concurrently
    end

    unless index_exists?(:oauth_access_tokens, :purpose)
      add_index :oauth_access_tokens, :purpose, algorithm: :concurrently
    end

    unless index_exists?(:oauth_access_tokens, %i[multi_account long_lived])
      add_index :oauth_access_tokens, %i[multi_account long_lived], algorithm: :concurrently
    end
  end

  def down
    remove_index :oauth_access_tokens, %i[multi_account long_lived], algorithm: :concurrently if index_exists?(:oauth_access_tokens, %i[multi_account long_lived])
    remove_index :oauth_access_tokens, :purpose, algorithm: :concurrently if index_exists?(:oauth_access_tokens, :purpose)
    remove_index :oauth_access_tokens, :multi_account, algorithm: :concurrently if index_exists?(:oauth_access_tokens, :multi_account)
    remove_column :oauth_access_tokens, :purpose if column_exists?(:oauth_access_tokens, :purpose)
    remove_column :oauth_access_tokens, :long_lived if column_exists?(:oauth_access_tokens, :long_lived)
    remove_column :oauth_access_tokens, :multi_account if column_exists?(:oauth_access_tokens, :multi_account)
  end
end
