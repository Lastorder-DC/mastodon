# frozen_string_literal: true

class Api::V1::PendingMentionsController < Api::BaseController
  before_action -> { doorkeeper_authorize! :read, :'read:notifications' }, only: [:index]
  before_action -> { doorkeeper_authorize! :write, :'write:notifications' }, only: [:destroy]
  before_action :require_user!
  after_action :insert_pagination_headers, only: :index

  DEFAULT_PENDING_MENTIONS_LIMIT = 40

  def index
    @notifications = load_notifications
    @relationships = StatusRelationshipsPresenter.new(target_statuses_from_notifications, current_user&.account_id)
    render json: @notifications, each_serializer: REST::NotificationSerializer, relationships: @relationships
  end

  def destroy
    PendingMentionCache.remove(current_account.id, params[:id].to_i)
    render_empty
  end

  private

  def load_notifications
    populate_if_empty!

    notification_ids = PendingMentionCache.get(
      current_account.id,
      limit_param(DEFAULT_PENDING_MENTIONS_LIMIT),
      params[:max_id],
      params[:since_id],
      params[:min_id]
    )

    # If results are fewer than requested limit and cache hasn't been extended,
    # extend the scan range and retry
    if notification_ids.length < limit_param(DEFAULT_PENDING_MENTIONS_LIMIT) && !PendingMentionCache.extended?(current_account.id)
      PendingMentionCache.extend(current_account.id)

      notification_ids = PendingMentionCache.get(
        current_account.id,
        limit_param(DEFAULT_PENDING_MENTIONS_LIMIT),
        params[:max_id],
        params[:since_id],
        params[:min_id]
      )
    end

    return [] if notification_ids.empty?

    notifications = Notification.where(id: notification_ids, account_id: current_account.id)
      .includes(from_account: [:account_stat, :user])
      .order(id: :desc)

    Notification.preload_cache_collection_target_statuses(notifications) do |target_statuses|
      preload_collection(target_statuses, Status)
    end
  end

  def populate_if_empty!
    return unless PendingMentionCache.count(current_account.id).zero?

    PendingMentionCache.populate(current_account.id)
  end

  def target_statuses_from_notifications
    @notifications.reject { |notification| notification.target_status.nil? }.map(&:target_status)
  end

  def next_path
    api_v1_pending_mentions_url pagination_params(max_id: pagination_max_id) unless @notifications.empty?
  end

  def prev_path
    api_v1_pending_mentions_url pagination_params(min_id: pagination_since_id) unless @notifications.empty?
  end

  def pagination_collection
    @notifications
  end
end
