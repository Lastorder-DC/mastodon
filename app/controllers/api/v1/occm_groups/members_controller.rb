# frozen_string_literal: true

class Api::V1::OccmGroups::MembersController < Api::BaseController
  include Authorization

  before_action -> { doorkeeper_authorize! :read, :'read:occm_groups' }, only: [:index, :pending]
  before_action -> { doorkeeper_authorize! :write, :'write:occm_groups' }, except: [:index, :pending]

  before_action :require_user!
  before_action :set_occm_group
  before_action :require_active_membership!, except: [:create]

  after_action :insert_pagination_headers, only: [:index, :pending]

  def index
    @memberships = load_active_memberships
    render json: @memberships, each_serializer: REST::OccmGroupMembershipSerializer
  end

  def pending
    authorize @occm_group, :moderate?
    @memberships = load_pending_memberships
    render json: @memberships, each_serializer: REST::OccmGroupMembershipSerializer
  end

  def create
    @membership = JoinOccmGroupService.new.call(current_account, @occm_group)
    render json: @membership, serializer: REST::OccmGroupMembershipSerializer
  end

  def approve
    authorize @occm_group, :moderate?
    @membership = ApproveOccmGroupMemberService.new.call(@occm_group, params[:id])
    render json: @membership, serializer: REST::OccmGroupMembershipSerializer
  end

  def reject
    authorize @occm_group, :moderate?
    @membership = RejectOccmGroupMemberService.new.call(@occm_group, params[:id])
    render json: @membership, serializer: REST::OccmGroupMembershipSerializer
  end

  def destroy
    target_account_id = if params[:id] == 'me' || params[:id] == current_account.id.to_s
                          current_account.id
                        else
                          authorize @occm_group, :moderate?
                          params[:id]
                        end

    RemoveOccmGroupMemberService.new.call(@occm_group, target_account_id, current_account)
    render_empty
  end

  private

  def set_occm_group
    @occm_group = OccmGroup.find(params[:occm_group_id])
  end

  def require_active_membership!
    raise ActiveRecord::RecordNotFound unless @occm_group.occm_group_memberships.exists?(account_id: current_account.id, state: :active)
  end

  def load_active_memberships
    @occm_group.occm_group_memberships.active
      .includes(:account)
      .paginate_by_max_id(limit_param(DEFAULT_ACCOUNTS_LIMIT), params[:max_id], params[:since_id])
  end

  def load_pending_memberships
    @occm_group.occm_group_memberships.pending
      .includes(:account)
      .paginate_by_max_id(limit_param(DEFAULT_ACCOUNTS_LIMIT), params[:max_id], params[:since_id])
  end

  def pagination_collection
    @memberships
  end

  def next_path
    api_v1_occm_group_members_url(pagination_params(max_id: pagination_max_id)) if records_continue?
  end

  def prev_path
    api_v1_occm_group_members_url(pagination_params(since_id: pagination_since_id)) unless @memberships.empty?
  end

  def records_continue?
    @memberships.size == limit_param(DEFAULT_ACCOUNTS_LIMIT)
  end
end
