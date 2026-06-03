# frozen_string_literal: true

class CreateDmChatRoomService < BaseService
  def call(owner, account_ids:, title: '')
    participants = Account.local.where(id: account_ids).where.not(id: owner.id).to_a

    raise ActiveRecord::RecordNotFound, 'No valid participants found' if participants.empty?

    room_type = participants.size == 1 ? :direct : :group_chat

    validate_no_blocks!(owner, participants)

    if room_type == :direct
      existing_room = find_existing_direct_room(owner, participants.first)
      return existing_room if existing_room
    end

    create_room(owner, participants, room_type, title)
  end

  private

  def validate_no_blocks!(owner, participants)
    participant_ids = participants.map(&:id)

    blocked_by_owner = Block.where(account: owner, target_account_id: participant_ids).exists?
    blocked_by_participants = Block.where(account_id: participant_ids, target_account: owner).exists?

    raise Mastodon::NotPermittedError if blocked_by_owner || blocked_by_participants
  end

  def find_existing_direct_room(owner, participant)
    owner_room_ids = DmChatRoomAccount.where(account: owner).active.pluck(:dm_chat_room_id)
    participant_room_ids = DmChatRoomAccount.where(account: participant).active.pluck(:dm_chat_room_id)

    common_room_ids = owner_room_ids & participant_room_ids

    DmChatRoom.where(id: common_room_ids, room_type: :direct).first
  end

  def create_room(owner, participants, room_type, title)
    room = DmChatRoom.create!(
      owner_account: owner,
      room_type: room_type,
      title: title
    )

    room.dm_chat_room_accounts.create!(
      account: owner,
      accepted: true,
      joined_at: Time.current
    )

    participants.each do |participant|
      auto_accept = Follow.exists?(account: participant, target_account: owner)
      room.dm_chat_room_accounts.create!(
        account: participant,
        accepted: auto_accept,
        joined_at: auto_accept ? Time.current : nil
      )
    end

    room
  end
end
