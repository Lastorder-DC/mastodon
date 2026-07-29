# frozen_string_literal: true

class BackfillProtectedAccountPrivacy < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def up
    Account.local.where(protected_account: true).in_batches do |accounts|
      AccountProtectionWorker.push_bulk(accounts.pluck(:id)) do |account_id|
        [account_id]
      end
    end
  end

  def down
    raise ActiveRecord::IrreversibleMigration
  end
end
