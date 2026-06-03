# frozen_string_literal: true

class Api::V1::OccmGroups::TimelinesController < Api::BaseController
  before_action -> { doorkeeper_authorize! :read, :'read:occm_groups' }

  before_action :require_user!
  before_action :set_occm_group
  before_action :require_active_membership!
  before_action :set_statuses

  after_action :insert_pagination_headers, unless: -> { @statuses.empty? }

  PERMITTED_PARAMS = %i(limit).freeze

  def show
    render json: @statuses,
           each_serializer: REST::StatusSerializer,
           relationships: StatusRelationshipsPresenter.new(@statuses, current_user.account_id)
  end

  private

  def set_occm_group
    @occm_group = OccmGroup.find(params[:occm_group_id])
  end

  def require_active_membership!
    raise ActiveRecord::RecordNotFound unless @occm_group.occm_group_memberships.exists?(account_id: current_account.id, state: :active)
  end

  def set_statuses
    @statuses = preload_collection(group_statuses, Status)
  end

  def group_statuses
    scope = @occm_group.occm_group_statuses
      .includes(status: :account)
      .order(id: :desc)

    scope = scope.where(OccmGroupStatus.arel_table[:id].lt(params[:max_id])) if params[:max_id].present?
    scope = scope.where(OccmGroupStatus.arel_table[:id].gt(params[:since_id])) if params[:since_id].present?

    if params[:min_id].present?
      scope.where(OccmGroupStatus.arel_table[:id].gt(params[:min_id]))
        .reorder(id: :asc)
        .limit(limit_param(DEFAULT_STATUSES_LIMIT))
        .reverse
        .map(&:status)
    else
      scope.limit(limit_param(DEFAULT_STATUSES_LIMIT)).map(&:status)
    end
  end

  def pagination_collection
    @statuses
  end

  def next_path
    api_v1_occm_group_timeline_url(@occm_group, pagination_params(max_id: pagination_max_id)) if records_continue?
  end

  def prev_path
    api_v1_occm_group_timeline_url(@occm_group, pagination_params(min_id: pagination_since_id)) unless @statuses.empty?
  end

  def records_continue?
    @statuses.size == limit_param(DEFAULT_STATUSES_LIMIT)
  end

  def pagination_params(core_params)
    params.slice(*PERMITTED_PARAMS).permit(*PERMITTED_PARAMS).merge(core_params)
  end
end
