# frozen_string_literal: true

class Api::V1::OccmGroups::ModeratorsController < Api::BaseController
  include Authorization

  before_action -> { doorkeeper_authorize! :write, :'write:occm_groups' }

  before_action :require_user!
  before_action :set_occm_group

  def create
    authorize @occm_group, :update?
    @membership = @occm_group.occm_group_memberships.where(state: :active, role: :user).find_by!(account_id: params[:account_id])
    @membership.update!(role: :moderator)
    render json: @membership, serializer: REST::OccmGroupMembershipSerializer
  end

  def destroy
    authorize @occm_group, :update?
    @membership = @occm_group.occm_group_memberships.where(state: :active, role: :moderator).find_by!(account_id: params[:id])
    @membership.update!(role: :user)
    render json: @membership, serializer: REST::OccmGroupMembershipSerializer
  end

  private

  def set_occm_group
    @occm_group = OccmGroup.find(params[:occm_group_id])
  end
end
