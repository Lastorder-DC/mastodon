# frozen_string_literal: true

class Api::V1::BookmarkCategoriesController < Api::BaseController
  before_action -> { doorkeeper_authorize! :read, :'read:lists' }, only: [:index, :show]
  before_action -> { doorkeeper_authorize! :write, :'write:lists' }, except: [:index, :show]

  before_action :require_user!
  before_action :set_bookmark_category, except: [:index, :create]

  rescue_from ArgumentError do |e|
    render json: { error: e.to_s }, status: 422
  end

  def index
    @bookmark_categories = BookmarkCategory.where(account: current_account).all
    render json: @bookmark_categories, each_serializer: REST::BookmarkCategorySerializer
  end

  def show
    render json: @bookmark_category, serializer: REST::BookmarkCategorySerializer
  end

  def create
    @bookmark_category = BookmarkCategory.create!(bookmark_category_params.merge(account: current_account))
    render json: @bookmark_category, serializer: REST::BookmarkCategorySerializer
  end

  def update
    @bookmark_category.update!(bookmark_category_params)
    render json: @bookmark_category, serializer: REST::BookmarkCategorySerializer
  end

  def destroy
    @bookmark_category.destroy!
    render_empty
  end

  private

  def set_bookmark_category
    @bookmark_category = BookmarkCategory.where(account: current_account).find(params[:id])
  end

  def bookmark_category_params
    params.permit(:title)
  end
end
