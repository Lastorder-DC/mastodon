# frozen_string_literal: true

class Api::V1::BookmarkCategories::StatusesController < Api::BaseController
  before_action -> { doorkeeper_authorize! :read, :'read:lists' }, only: [:show]
  before_action -> { doorkeeper_authorize! :write, :'write:lists' }, except: [:show]

  before_action :require_user!
  before_action :set_bookmark_category

  after_action :insert_pagination_headers, only: :show

  def show
    @statuses = load_statuses
    render json: @statuses, each_serializer: REST::StatusSerializer
  end

  def create
    ApplicationRecord.transaction do
      bookmark_category_statuses.each do |status|
        Bookmark.find_or_create_by!(account: current_account, status: status)
        @bookmark_category.statuses << status
      end
    end

    render_empty
  end

  def destroy
    BookmarkCategoryStatus.where(bookmark_category: @bookmark_category, status_id: status_ids).destroy_all
    render_empty
  end

  private

  def set_bookmark_category
    @bookmark_category = current_account.bookmark_categories.find(params[:bookmark_category_id])
  end

  def load_statuses
    if unlimited?
      @bookmark_category.statuses.includes(:status_stat).all
    else
      @bookmark_category.statuses.includes(:status_stat).paginate_by_max_id(limit_param(DEFAULT_STATUSES_LIMIT), params[:max_id], params[:since_id])
    end
  end

  def bookmark_category_statuses
    Status.find(status_ids)
  end

  def status_ids
    Array(resource_params[:status_ids])
  end

  def resource_params
    params.permit(status_ids: [])
  end

  def insert_pagination_headers
    set_pagination_headers(next_path, prev_path)
  end

  def next_path
    return if unlimited?

    api_v1_bookmark_category_statuses_url pagination_params(max_id: pagination_max_id) if records_continue?
  end

  def prev_path
    return if unlimited?

    api_v1_bookmark_category_statuses_url pagination_params(since_id: pagination_since_id) unless @statuses.empty?
  end

  def pagination_max_id
    @statuses.last.id
  end

  def pagination_since_id
    @statuses.first.id
  end

  def records_continue?
    @statuses.size == limit_param(DEFAULT_STATUSES_LIMIT)
  end

  def pagination_params(core_params)
    params.slice(:limit).permit(:limit).merge(core_params)
  end

  def unlimited?
    params[:limit] == '0'
  end
end
