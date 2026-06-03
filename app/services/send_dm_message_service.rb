# frozen_string_literal: true

class SendDmMessageService < BaseService
  MAX_CONTENT_LENGTH = 5000

  class ContentTooLongError < StandardError; end

  def call(account, chat_room, content:, media_ids: [], in_reply_to_id: nil, language: nil)
    raise ContentTooLongError, "Content exceeds maximum length of #{MAX_CONTENT_LENGTH} characters" if content.present? && content.length > MAX_CONTENT_LENGTH

    membership = chat_room.dm_chat_room_accounts.active.find_by!(account: account)

    raise Mastodon::NotPermittedError unless membership.accepted?

    processed_content = process_content(content)
    plain_content = ActionController::Base.helpers.strip_tags(processed_content)

    message = chat_room.dm_messages.create!(
      account: account,
      content: processed_content,
      content_plain: plain_content,
      in_reply_to_id: in_reply_to_id,
      language: language
    )

    attach_media(message, account, media_ids) if media_ids.present?

    message
  end

  private

  def process_content(content)
    escaped = ERB::Util.html_escape(content)
    "<p>#{escaped}</p>"
  end

  def attach_media(message, account, media_ids)
    media_attachments = MediaAttachment.where(id: media_ids, account_id: account.id)

    media_attachments.each do |media|
      message.dm_message_attachments.create!(media_attachment: media)
    end
  end
end
