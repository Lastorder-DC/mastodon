# frozen_string_literal: true

class Api::V1::OccmGroups::StatusesController < Api::BaseController
  before_action -> { doorkeeper_authorize! :write, :'write:occm_groups' }

  before_action :require_user!
  before_action :set_occm_group

  def create
    authorize @occm_group, :post?
    @status = PostToOccmGroupService.new.call(current_account, @occm_group, status_params)
    render json: @status, serializer: REST::StatusSerializer
  end

  def destroy
    authorize @occm_group, :moderate?
    @status = Status.find(params[:id])
    DeleteOccmGroupStatusService.new.call(@occm_group, @status, current_account)
    render_empty
  end

  private

  def set_occm_group
    @occm_group = OccmGroup.find(params[:occm_group_id])
  end

  def status_params
    params.permit(:status, media_ids: [])
  end
end
