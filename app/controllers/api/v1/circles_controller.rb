# frozen_string_literal: true

class Api::V1::CirclesController < Api::BaseController
  before_action -> { doorkeeper_authorize! :read, :'read:lists' }, only: [:index, :show]
  before_action -> { doorkeeper_authorize! :write, :'write:lists' }, except: [:index, :show]

  before_action :require_user!
  before_action :set_circle, except: [:index, :create]

  rescue_from ArgumentError do |e|
    render json: { error: e.to_s }, status: 422
  end

  def index
    @circles = Circle.where(account: current_account).all
    render json: @circles, each_serializer: REST::CircleSerializer
  end

  def show
    render json: @circle, serializer: REST::CircleSerializer
  end

  def create
    @circle = Circle.create!(circle_params.merge(account: current_account))
    render json: @circle, serializer: REST::CircleSerializer
  end

  def update
    @circle.update!(circle_params)
    render json: @circle, serializer: REST::CircleSerializer
  end

  def destroy
    @circle.destroy!
    render_empty
  end

  private

  def set_circle
    @circle = Circle.where(account: current_account).find(params[:id])
  end

  def circle_params
    params.permit(:title)
  end
end
