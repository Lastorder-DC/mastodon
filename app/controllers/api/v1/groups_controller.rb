# frozen_string_literal: true

class Api::V1::GroupsController < Api::BaseController
  include Authorization

  before_action -> { doorkeeper_authorize! :read, :'read:groups' }, only: [:index, :show, :share]
  before_action -> { doorkeeper_authorize! :write, :'write:groups' }, except: [:index, :show, :share]
  before_action :require_user!
  before_action :set_group, only: [:show, :update, :destroy, :share, :share_link, :join, :leave, :transfer_ownership]

  def index
    @groups = current_account.community_group_memberships.includes(:community_group).map(&:community_group)
    render json: @groups, each_serializer: REST::CommunityGroupSerializer
  end

  def show
    authorize @group, :show?
    render json: @group, serializer: REST::CommunityGroupSerializer
  end

  def create
    @group = CommunityGroup.create!(group_params.merge(owner_account: current_account))
    render json: @group, serializer: REST::CommunityGroupSerializer
  end

  def update
    authorize @group, :update?
    @group.update!(group_params)
    render json: @group, serializer: REST::CommunityGroupSerializer
  end

  def destroy
    authorize @group, :destroy?
    @group.destroy!
    render_empty
  end

  def share
    authorize @group, :show?
    render json: { id: @group.id.to_s, share_token: @group.share_token }
  end

  def share_link
    authorize @group, :update?
    @group.rotate_share_token!
    render json: { id: @group.id.to_s, share_token: @group.share_token }
  end

  def join_by_token
    @group = CommunityGroup.find_by!(share_token: params[:token])
    join_group
  end

  def join
    join_group
  end

  def leave
    authorize @group, :leave?
    @group.memberships.where(account: current_account).destroy_all
    render_empty
  end

  def transfer_ownership
    authorize @group, :transfer_ownership?
    @group.transfer_ownership!(Account.local.find(params[:account_id]))
    render json: @group, serializer: REST::CommunityGroupSerializer
  end

  private

  def set_group
    @group = CommunityGroup.find(params[:id])
  end

  def join_group
    authorize @group, :join?

    if @group.locked?
      @request = @group.join_requests.create!(account: current_account, message: params[:message])
      notify_group_managers_of_join_request!(@request)
      render json: @request, serializer: REST::CommunityGroupJoinRequestSerializer
    else
      @membership = @group.memberships.create!(account: current_account, role: :member)
      render json: @membership, serializer: REST::CommunityGroupMembershipSerializer
    end
  end

  def group_params
    params.permit(:display_name, :note, :locked, :discoverable)
  end

  def notify_group_managers_of_join_request!(join_request)
    @group.memberships.where(role: %i(admin moderator)).where.not(account_id: current_account.id).find_each do |membership|
      LocalNotificationWorker.perform_async(membership.account_id, join_request.id, join_request.class.name, 'community_group_join_request')
    end
  end
end
