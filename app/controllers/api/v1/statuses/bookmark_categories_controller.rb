# frozen_string_literal: true

class Api::V1::Statuses::BookmarkCategoriesController < Api::BaseController
  before_action -> { doorkeeper_authorize! :read, :'read:lists' }
  before_action :require_user!
  before_action :set_status

  def index
    @statuses = @status.deleted_at.present? ? [] : @status.joined_bookmark_categories.where(account: current_account)
    render json: @statuses, each_serializer: REST::BookmarkCategorySerializer
  end

  private

  def set_status
    @status = Status.find(params[:status_id])
  end
end
