# frozen_string_literal: true

class JoinOccmGroupService < BaseService
  def call(account, occm_group)
    @account = account
    @group = occm_group

    existing = @group.occm_group_memberships.find_by(account: @account)
    raise Mastodon::ValidationError, I18n.t('occm_groups.errors.already_member') if existing&.state_active?
    raise Mastodon::ValidationError, I18n.t('occm_groups.errors.already_pending') if existing&.state_pending?

    if @group.approval_required?
      @membership = @group.occm_group_memberships.create!(
        account: @account,
        role: :user,
        state: :pending
      )

      notify_admins_and_mods!
    else
      @membership = @group.occm_group_memberships.create!(
        account: @account,
        role: :user,
        state: :active
      )

      @group.increment!(:member_count)
    end

    @membership
  end

  private

  def notify_admins_and_mods!
    @group.occm_group_memberships.with_moderation_role.active.find_each do |mod_membership|
      NotifyOccmGroupService.new.call(mod_membership.account, :occm_group_join_request, @membership)
    end
  end
end
