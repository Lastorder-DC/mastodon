# frozen_string_literal: true

class Api::V1::Groups::ReportsController < Api::BaseController
  include Authorization

  before_action -> { doorkeeper_authorize! :read, :'read:groups' }, only: [:index, :show]
  before_action -> { doorkeeper_authorize! :write, :'write:groups' }, only: [:resolve, :unresolve]
  before_action -> { doorkeeper_authorize! :write, :'write:reports' }, only: [:create]
  before_action :require_user!
  before_action :set_group
  before_action :set_report, only: [:show, :resolve, :unresolve]

  def index
    authorize @group, :manage_members?
    reports = @group.reports.includes(:account, :target_account).to_a_paginated_by_id(limit_param(DEFAULT_STATUSES_LIMIT), params_slice(:max_id, :since_id, :min_id))
    render json: reports, each_serializer: REST::CommunityGroupReportSerializer
  end

  def show
    authorize @report, :show?
    render json: @report, serializer: REST::CommunityGroupReportSerializer
  end

  def create
    @report = @group.reports.build(report_params.merge(account: current_account, target_account: target_account))
    authorize @report, :create?
    @report.save!
    notify_group_managers!
    render json: @report, serializer: REST::CommunityGroupReportSerializer
  end

  def resolve
    authorize @report, :resolve?
    @report.resolve!(current_account)
    render json: @report, serializer: REST::CommunityGroupReportSerializer
  end

  def unresolve
    authorize @report, :unresolve?
    @report.unresolve!
    render json: @report, serializer: REST::CommunityGroupReportSerializer
  end

  private

  def set_group
    @group = CommunityGroup.find(params[:group_id])
  end

  def set_report
    @report = @group.reports.find(params[:id])
  end

  def target_account
    @target_account ||= Account.find(report_params[:account_id])
  end

  def notify_group_managers!
    @group.memberships.where(role: %i(admin moderator)).where.not(account_id: current_account.id).find_each do |membership|
      LocalNotificationWorker.perform_async(membership.account_id, @report.id, @report.class.name, 'community_group_report')
    end
  end

  def report_params
    params.permit(:account_id, :comment, status_ids: [], rule_ids: [])
  end
end
