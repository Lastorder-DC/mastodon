# frozen_string_literal: true

namespace :dm do
  desc 'Migrate all existing conversations to DM chat rooms'
  task migrate_all: :environment do
    total = AccountConversation.distinct.count(:account_id)
    migrated = 0

    puts "Starting DM migration for #{total} accounts..."

    AccountConversation.distinct.pluck(:account_id).each_slice(100) do |batch|
      batch.each do |account_id|
        MigrateConversationsToDmWorker.perform_async(account_id)
        migrated += 1
      end
      puts "Enqueued #{migrated}/#{total} accounts..."
    end

    puts "Done! Enqueued migration workers for #{migrated} accounts."
    puts 'Monitor progress in Sidekiq dashboard.'
  end

  desc 'Check migration status for a specific account'
  task :migration_status, [:account_id] => :environment do |_t, args|
    account_id = args[:account_id]

    # Use Redisable concern via a helper class to respect connection pooling
    # and Sentinel configuration instead of instantiating Redis.new directly.
    checker = Class.new { include Redisable }.new

    if checker.redis.exists?("dm:migrated:#{account_id}")
      puts "Account #{account_id}: Migration COMPLETE"
    elsif checker.redis.exists?("dm:migrating:#{account_id}")
      puts "Account #{account_id}: Migration IN PROGRESS"
    else
      puts "Account #{account_id}: Migration NOT STARTED"
    end
  end
end
