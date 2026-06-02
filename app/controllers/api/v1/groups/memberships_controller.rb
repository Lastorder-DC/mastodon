# frozen_string_literal: true

class Api::V1::Groups::MembershipsController < Api::BaseController
  include Authorization

  before_action -> { doorkeeper_authorize! :read, :'read:groups' }, only: [:index]
  before_action -> { doorkeeper_authorize! :write, :'write:groups' }, except: [:index]
  before_action :require_user!
  before_action :set_group

  def index
    authorize @group, :show?
    memberships = @group.memberships.includes(account: [:account_stat, user: :role])
    memberships = memberships.where(role: params[:role]) if params[:role].present?
    render json: memberships, each_serializer: REST::CommunityGroupMembershipSerializer
  end

  def update
    authorize @group, :update?
    raise Mastodon::ValidationError, I18n.t('community_groups.errors.transfer_required_for_admin') if membership_params[:role].to_s == 'admin'

    membership.update!(membership_params)
    render json: membership, serializer: REST::CommunityGroupMembershipSerializer
  end

  def destroy
    authorize @group, :manage_members?
    raise Mastodon::NotPermittedError if membership.admin? || (membership.moderator? && !@group.admin?(current_account))

    membership.destroy!
    render_empty
  end

  private

  def set_group
    @group = CommunityGroup.find(params[:group_id])
  end

  def membership
    @membership ||= @group.memberships.find(params[:id])
  end

  def membership_params
    params.permit(:role)
  end
end
