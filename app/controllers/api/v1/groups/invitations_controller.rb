# frozen_string_literal: true

class Api::V1::Groups::InvitationsController < Api::BaseController
  include Authorization

  before_action -> { doorkeeper_authorize! :read, :'read:groups' }, only: [:index]
  before_action -> { doorkeeper_authorize! :write, :'write:groups' }, except: [:index]
  before_action :require_user!
  before_action :set_group

  def index
    authorize @group, :manage_members?
    render json: @group.invitations.pending.includes(invitee_account: [:account_stat, user: :role]), each_serializer: REST::CommunityGroupInvitationSerializer
  end

  def create
    authorize @group, :manage_members?
    invitation = @group.invitations.create!(inviter_account: current_account, invitee_account: Account.local.find(params[:account_id]), expires_at: params[:expires_at])
    render json: invitation, serializer: REST::CommunityGroupInvitationSerializer
  end

  def accept
    invitation = @group.invitations.pending.find(params[:id])
    raise Mastodon::NotPermittedError unless invitation.invitee_account_id == current_account.id

    membership = @group.memberships.create!(account: current_account, role: :member)
    invitation.accepted!
    render json: membership, serializer: REST::CommunityGroupMembershipSerializer
  end

  def reject
    invitation = @group.invitations.pending.find(params[:id])
    raise Mastodon::NotPermittedError unless invitation.invitee_account_id == current_account.id

    invitation.rejected!
    render json: invitation, serializer: REST::CommunityGroupInvitationSerializer
  end

  def destroy
    authorize @group, :manage_members?
    invitation = @group.invitations.pending.find(params[:id])
    invitation.revoked!
    render_empty
  end

  private

  def set_group
    @group = CommunityGroup.find(params[:group_id])
  end
end
