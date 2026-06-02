# frozen_string_literal: true

class Api::V1::Timelines::GroupController < Api::V1::Timelines::BaseController
  include Authorization

  before_action -> { doorkeeper_authorize! :read, :'read:groups' }
  before_action :require_user!
  before_action :set_group
  before_action :set_statuses

  PERMITTED_PARAMS = %i(limit).freeze

  def show
    render json: @statuses,
           each_serializer: REST::StatusSerializer,
           relationships: StatusRelationshipsPresenter.new(@statuses, current_user.account_id)
  end

  private

  def set_group
    @group = CommunityGroup.find(params[:id])
    authorize @group, :show?
  end

  def set_statuses
    @statuses = preload_collection(group_statuses, Status)
  end

  def group_statuses
    Status.where(community_group: @group).community_group_approved.to_a_paginated_by_id(
      limit_param(DEFAULT_STATUSES_LIMIT),
      params_slice(:max_id, :since_id, :min_id)
    )
  end

  def next_path
    api_v1_timelines_group_url params[:id], next_path_params
  end

  def prev_path
    api_v1_timelines_group_url params[:id], prev_path_params
  end
end
