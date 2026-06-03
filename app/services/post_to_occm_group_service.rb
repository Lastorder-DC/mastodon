# frozen_string_literal: true

class PostToOccmGroupService < BaseService
  def call(account, occm_group, params)
    @account = account
    @group = occm_group
    @params = params

    membership = @group.occm_group_memberships.find_by(account: @account, state: :active)
    raise Mastodon::NotPermittedError unless membership

    @status = PostStatusService.new.call(
      @account,
      text: @params[:status],
      visibility: :limited,
      local_only: true,
      media_ids: @params[:media_ids]
    )

    @group.occm_group_statuses.create!(
      status: @status,
      account: @account
    )

    DistributeOccmGroupStatusService.new.call(@status, @group)

    @status
  end
end
