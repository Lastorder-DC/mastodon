# frozen_string_literal: true

class REST::DmMessageSerializer < ActiveModel::Serializer
  attributes :id, :dm_chat_room_uuid, :content, :content_plain,
             :in_reply_to_id, :created_at, :language

  has_one :account, serializer: REST::AccountSerializer
  has_many :media_attachments, serializer: REST::MediaAttachmentSerializer, key: :attachments

  def id
    object.id.to_s
  end

  def dm_chat_room_uuid
    object.dm_chat_room.uuid
  end

  def in_reply_to_id
    object.in_reply_to_id&.to_s
  end

  def media_attachments
    object.media_attachments
  end

  def created_at
    object.created_at.iso8601
  end
end
