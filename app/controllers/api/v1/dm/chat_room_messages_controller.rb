# frozen_string_literal: true

class Api::V1::Dm::ChatRoomMessagesController < Api::BaseController
  include DmChatRoomFinder
  LIMIT = 20

  before_action -> { doorkeeper_authorize! :read, :'read:dm' }, only: [:index]
  before_action -> { doorkeeper_authorize! :write, :'write:dm' }, only: [:create, :destroy]
  before_action :require_user!
  before_action :set_chat_room
  after_action :insert_pagination_headers, only: :index

  rescue_from SendDmMessageService::ContentTooLongError, with: :unprocessable_content_length

  def index
    @messages = paginated_messages
    render json: @messages, each_serializer: REST::DmMessageSerializer
  end

  def create
    @message = SendDmMessageService.new.call(
      current_account,
      @chat_room,
      content: message_params[:content],
      media_ids: message_params[:media_ids] || [],
      in_reply_to_id: message_params[:in_reply_to_id],
      language: message_params[:language]
    )

    render json: @message, serializer: REST::DmMessageSerializer
  end

  def destroy
    @message = @chat_room.dm_messages.find(params[:id])

    raise Mastodon::NotPermittedError unless @message.account_id == current_account.id

    @message.update!(hidden: true)
    render_empty
  end

  private

  def paginated_messages
    @chat_room.dm_messages
              .visible
              .includes(:account, dm_message_attachments: :media_attachment)
              .to_a_paginated_by_id(limit_param(LIMIT), params_slice(:max_id, :since_id, :min_id))
  end

  def message_params
    params.permit(:content, :in_reply_to_id, :language, media_ids: [])
  end

  def next_path
    api_v1_dm_chat_room_messages_url(chat_room_id: @chat_room.id, **pagination_params(max_id: pagination_max_id)) if records_continue?
  end

  def prev_path
    api_v1_dm_chat_room_messages_url(chat_room_id: @chat_room.id, **pagination_params(min_id: pagination_since_id)) unless @messages.empty?
  end

  def pagination_max_id
    @messages.last.id
  end

  def pagination_since_id
    @messages.first.id
  end

  def records_continue?
    @messages.size == limit_param(LIMIT)
  end

  def unprocessable_content_length(exception)
    render json: { error: exception.message }, status: 422
  end
end
