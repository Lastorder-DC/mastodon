# frozen_string_literal: true

class ResolveOccmGroupReportService < BaseService
  def call(occm_group, report, action, current_account)
    @group = occm_group
    @report = report
    @action = action
    @current_account = current_account

    @report.update!(
      action_taken_at: Time.now.utc,
      action_taken_by_account_id: @current_account.id
    )

    case @action
    when 'delete_posts'
      delete_reported_posts!
    when 'remove_member'
      RemoveOccmGroupMemberService.new.call(@group, @report.target_account_id, @current_account)
    end

    @report
  end

  private

  def delete_reported_posts!
    Status.where(id: @report.status_ids).find_each do |status|
      DeleteOccmGroupStatusService.new.call(@group, status, @current_account)
    end
  end
end
