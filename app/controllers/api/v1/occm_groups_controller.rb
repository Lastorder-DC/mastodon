# frozen_string_literal: true

class Api::V1::OccmGroupsController < Api::BaseController
  include Authorization

  before_action -> { doorkeeper_authorize! :read, :'read:occm_groups' }, only: [:index, :show]
  before_action -> { doorkeeper_authorize! :write, :'write:occm_groups' }, except: [:index, :show]

  before_action :require_user!
  before_action :set_occm_group, except: [:index, :create]

  def index
    @occm_groups = OccmGroup.joins(:occm_group_memberships)
      .where(occm_group_memberships: { account_id: current_account.id, state: :active })
    memberships = OccmGroupMembership.where(occm_group_id: @occm_groups.select(:id), account_id: current_account.id)
      .index_by(&:occm_group_id)
    render json: @occm_groups, each_serializer: REST::OccmGroupSerializer, memberships_map: memberships
  end

  def show
    render json: @occm_group, serializer: REST::OccmGroupSerializer, current_account: current_account
  end

  def create
    @occm_group = CreateOccmGroupService.new.call(current_account, occm_group_params)
    render json: @occm_group, serializer: REST::OccmGroupSerializer, current_account: current_account
  end

  def update
    authorize @occm_group, :update?
    @occm_group.update!(occm_group_params)
    render json: @occm_group, serializer: REST::OccmGroupSerializer, current_account: current_account
  end

  def destroy
    authorize @occm_group, :destroy?
    @occm_group.destroy!
    render_empty
  end

  def transfer
    authorize @occm_group, :transfer?
    TransferOccmGroupAdminService.new.call(@occm_group, params[:account_id])
    render json: @occm_group.reload, serializer: REST::OccmGroupSerializer, current_account: current_account
  end

  private

  def set_occm_group
    @occm_group = OccmGroup.find(params[:id])
  end

  def occm_group_params
    params.permit(:title, :description, :approval_required)
  end
end
