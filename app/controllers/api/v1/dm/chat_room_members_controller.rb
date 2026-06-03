# frozen_string_literal: true

class Api::V1::Dm::ChatRoomMembersController < Api::BaseController
  include DmChatRoomFinder
  before_action -> { doorkeeper_authorize! :write, :'write:dm' }
  before_action :require_user!
  before_action :set_chat_room

  def create
    raise Mastodon::NotPermittedError unless @chat_room.owner_account_id == current_account.id
    raise Mastodon::NotPermittedError unless @chat_room.group_chat?

    account = Account.find(member_params[:account_id])
    validate_no_blocks!(account)

    membership = @chat_room.dm_chat_room_accounts.find_or_initialize_by(account: account)
    membership.update!(accepted: false, left_at: nil)

    render json: @chat_room, serializer: REST::DmChatRoomSerializer
  end

  def destroy
    raise Mastodon::NotPermittedError unless @chat_room.owner_account_id == current_account.id

    membership = @chat_room.dm_chat_room_accounts.active.find(params[:id])
    membership.update!(left_at: Time.current)

    render_empty
  end

  def accept
    membership = @chat_room.dm_chat_room_accounts.find_by!(account: current_account)

    raise Mastodon::NotPermittedError if membership.accepted?

    membership.update!(accepted: true, joined_at: Time.current)
    render json: @chat_room, serializer: REST::DmChatRoomSerializer
  end

  private

  def member_params
    params.permit(:account_id)
  end

  def validate_no_blocks!(account)
    blocked = Block.where(account: current_account, target_account: account).exists? ||
              Block.where(account: account, target_account: current_account).exists?

    raise Mastodon::NotPermittedError if blocked
  end
end
