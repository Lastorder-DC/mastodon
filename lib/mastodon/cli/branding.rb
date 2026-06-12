# frozen_string_literal: true

require_relative 'base'

module Mastodon::CLI
  class Branding < Base
    desc 'force USERNAME SOURCE_USERNAME', 'Force an account to use another account\'s custom branding'
    long_desc <<-LONG_DESC
      Force the account identified by USERNAME to use the custom logo
      and background image from SOURCE_USERNAME's account.
    LONG_DESC
    def force(username, source_username)
      account = Account.find_local(username)
      fail_with_message "Account not found: #{username}" if account.nil?

      source_account = Account.find_local(source_username)
      fail_with_message "Source account not found: #{source_username}" if source_account.nil?

      account.update!(custom_branding_source_account_id: source_account.id)
      say("OK, #{username} now uses #{source_username}'s custom branding", :green)
    end

    desc 'release USERNAME', 'Release forced custom branding from an account'
    long_desc <<-LONG_DESC
      Remove the forced custom branding from the account identified
      by USERNAME. The account will revert to its own custom logo
      and background image settings.
    LONG_DESC
    def release(username)
      account = Account.find_local(username)
      fail_with_message "Account not found: #{username}" if account.nil?

      if account.custom_branding_source_account_id.nil?
        say("#{username} does not have forced custom branding", :yellow)
        return
      end

      account.update!(custom_branding_source_account_id: nil)
      say("OK, released forced custom branding from #{username}", :green)
    end

    desc 'status USERNAME', 'Show custom branding status for an account'
    long_desc <<-LONG_DESC
      Display the current custom branding configuration for the
      account identified by USERNAME.
    LONG_DESC
    def status(username)
      account = Account.find_local(username)
      fail_with_message "Account not found: #{username}" if account.nil?

      if account.custom_branding_source_account_id.present?
        source = Account.find(account.custom_branding_source_account_id)
        say("#{username} is using forced branding from: #{source.username}")
      elsif account.custom_logo_file_name.present? || account.background_image_file_name.present?
        say("#{username} has custom branding (self-configured)")
        say("  Logo: #{account.custom_logo_file_name || 'none'}")
        say("  Background: #{account.background_image_file_name || 'none'}")
      else
        say("#{username} has no custom branding")
      end
    end
  end
end
