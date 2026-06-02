# frozen_string_literal: true

class Api::V1::Groups::BlocksController < Api::BaseController
  include Authorization

  before_action -> { doorkeeper_authorize! :read, :'read:groups' }, only: [:index]
  before_action -> { doorkeeper_authorize! :write, :'write:groups' }, except: [:index]
  before_action :require_user!
  before_action :set_group

  def index
    authorize @group, :manage_members?
    render json: @group.account_blocks.includes(account: [:account_stat, user: :role]), each_serializer: REST::CommunityGroupAccountBlockSerializer
  end

  def create
    authorize @group, :manage_members?
    account = Account.local.find(params[:account_id])
    membership = @group.memberships.find_by(account: account)
    raise Mastodon::NotPermittedError if membership&.admin? || (membership&.moderator? && !@group.admin?(current_account))

    block = @group.account_blocks.create!(account: account, blocked_by_account: current_account, reason: params[:reason])
    render json: block, serializer: REST::CommunityGroupAccountBlockSerializer
  end

  def destroy
    authorize @group, :manage_members?
    @group.account_blocks.find_by!(account_id: params[:account_id]).destroy!
    render_empty
  end

  private

  def set_group
    @group = CommunityGroup.find(params[:group_id])
  end
end
