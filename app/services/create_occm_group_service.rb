# frozen_string_literal: true

class CreateOccmGroupService < BaseService
  def call(account, params)
    @account = account
    @params = params

    ApplicationRecord.transaction do
      @group = OccmGroup.create!(
        account: @account,
        title: @params[:title],
        description: @params[:description] || '',
        approval_required: @params.fetch(:approval_required, true)
      )

      @group.occm_group_memberships.create!(
        account: @account,
        role: :admin,
        state: :active
      )

      @group.update!(member_count: 1)
    end

    @group
  end
end
