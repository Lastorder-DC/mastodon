# frozen_string_literal: true

class Api::V1::OccmGroups::ReportsController < Api::BaseController
  before_action -> { doorkeeper_authorize! :read, :'read:occm_groups' }, only: [:index]
  before_action -> { doorkeeper_authorize! :write, :'write:occm_groups' }, except: [:index]

  before_action :require_user!
  before_action :set_occm_group
  before_action :require_active_membership!

  after_action :insert_pagination_headers, only: :index

  def index
    authorize @occm_group, :moderate?
    @reports = load_reports
    render json: @reports, each_serializer: REST::OccmGroupReportSerializer
  end

  def create
    @report = @occm_group.occm_group_reports.create!(report_params.merge(account: current_account))
    render json: @report, serializer: REST::OccmGroupReportSerializer
  end

  def resolve
    authorize @occm_group, :moderate?
    @report = @occm_group.occm_group_reports.find(params[:id])
    ResolveOccmGroupReportService.new.call(@occm_group, @report, params[:action], current_account)
    render json: @report.reload, serializer: REST::OccmGroupReportSerializer
  end

  private

  def set_occm_group
    @occm_group = OccmGroup.find(params[:occm_group_id])
  end

  def require_active_membership!
    raise ActiveRecord::RecordNotFound unless @occm_group.occm_group_memberships.exists?(account_id: current_account.id, state: :active)
  end

  def load_reports
    scope = @occm_group.occm_group_reports.includes(:account, :target_account, :action_taken_by_account)
    scope = params[:resolved] == 'true' ? scope.resolved : scope.unresolved if params[:resolved].present?
    scope.paginate_by_max_id(limit_param(DEFAULT_STATUSES_LIMIT), params[:max_id], params[:since_id])
  end

  def report_params
    params.permit(:target_account_id, :comment, :category, status_ids: [])
  end

  def pagination_collection
    @reports
  end

  def next_path
    api_v1_occm_group_reports_url(@occm_group, pagination_params(max_id: pagination_max_id)) if records_continue?
  end

  def prev_path
    api_v1_occm_group_reports_url(@occm_group, pagination_params(since_id: pagination_since_id)) unless @reports.empty?
  end

  def records_continue?
    @reports.size == limit_param(DEFAULT_STATUSES_LIMIT)
  end
end
