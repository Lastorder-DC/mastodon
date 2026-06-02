# frozen_string_literal: true

class Api::V1::Groups::MembershipRequestsController < Api::BaseController
  include Authorization

  before_action -> { doorkeeper_authorize! :read, :'read:groups' }, only: [:index]
  before_action -> { doorkeeper_authorize! :write, :'write:groups' }, except: [:index]
  before_action :require_user!
  before_action :set_group

  def index
    authorize_with current_account, @group, :manage_members?
    render json: @group.join_requests.pending.includes(account: [:account_stat, user: :role]), each_serializer: REST::CommunityGroupJoinRequestSerializer
  end

  def authorize
    authorize_with current_account, @group, :manage_members?
    join_request = @group.join_requests.pending.find(params[:id])
    membership = @group.memberships.create!(account: join_request.account, role: :member)
    join_request.update!(status: :approved, reviewed_by_account: current_account, reviewed_at: Time.current)
    LocalNotificationWorker.perform_async(join_request.account_id, join_request.id, join_request.class.name, 'community_group_join_request_approved')
    render json: membership, serializer: REST::CommunityGroupMembershipSerializer
  end

  def reject
    authorize_with current_account, @group, :manage_members?
    join_request = @group.join_requests.pending.find(params[:id])
    join_request.update!(status: :rejected, reviewed_by_account: current_account, reviewed_at: Time.current)
    LocalNotificationWorker.perform_async(join_request.account_id, join_request.id, join_request.class.name, 'community_group_join_request_rejected')
    render json: join_request, serializer: REST::CommunityGroupJoinRequestSerializer
  end

  private

  def set_group
    @group = CommunityGroup.find(params[:group_id])
  end
end
