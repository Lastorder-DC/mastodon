# frozen_string_literal: true

module DmChatRoomFinder
  extend ActiveSupport::Concern

  private

  def set_chat_room
    scope = DmChatRoom.active_for_account(current_account)
    identifier = params[:chat_room_id] || params[:id]
    @chat_room = if identifier.to_s.match?(DmChatRoom::UUID_REGEX)
                   scope.find_by!(uuid: identifier)
                 else
                   scope.find(identifier)
                 end
  end
end
