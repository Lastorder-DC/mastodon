# frozen_string_literal: true

class BootstrapTimelineService < BaseService
  def call(source_account)
    @source_account = source_account

    autofollow_inviter!
    apply_forced_branding!
    notify_staff!
  end

  private

  def autofollow_inviter!
    return unless @source_account&.user&.invite&.autofollow?

    FollowService.new.call(@source_account, @source_account.user.invite.user.account)
  end

  def apply_forced_branding!
    invite = @source_account&.user&.invite
    return unless invite&.force_custom_branding?

    inviter_account = invite.user.account
    @source_account.update!(custom_branding_source_account_id: inviter_account.id)
  end

  def notify_staff!
    User.those_who_can(:manage_users).includes(:account).find_each do |user|
      LocalNotificationWorker.perform_async(user.account_id, @source_account.id, 'Account', 'admin.sign_up')
    end
  end
end
