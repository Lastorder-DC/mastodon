# frozen_string_literal: true

class RemoveOccmGroupMemberService < BaseService
  include Redisable

  def call(occm_group, account_id, current_account)
    @group = occm_group
    @current_account = current_account
    @membership = @group.occm_group_memberships.where(state: :active).find_by!(account_id: account_id)

    raise Mastodon::ValidationError, I18n.t('occm_groups.errors.cannot_remove_admin') if @membership.role_admin?

    @membership.destroy!
    @group.decrement!(:member_count)

    publish_revoke_event!

    nil
  end

  private

  def publish_revoke_event!
    redis.publish("timeline:occm_group:#{@group.id}", JSON.generate(event: :remove_member, payload: @membership.account_id.to_s))
  end
end
