# frozen_string_literal: true

class DmMessage < ApplicationRecord
  include Paginable
  include Redisable

  # Set to true to suppress after_create side effects (streaming, unread marks,
  # timestamp updates). Used by the migration worker to avoid flooding channels
  # with historical messages.
  attr_accessor :skip_side_effects

  belongs_to :dm_chat_room
  belongs_to :account
  belongs_to :in_reply_to, class_name: 'DmMessage', optional: true
  belongs_to :status, optional: true
  has_many :dm_message_attachments, dependent: :destroy
  has_many :media_attachments, through: :dm_message_attachments

  scope :visible, -> { where(hidden: false) }
  scope :ordered, -> { order(created_at: :asc) }
  scope :reverse_ordered, -> { order(created_at: :desc) }

  after_create :update_room_timestamp, unless: :skip_side_effects
  after_create :mark_others_unread, unless: :skip_side_effects
  after_create_commit :push_to_streaming, unless: :skip_side_effects

  def emojis
    return @emojis if defined?(@emojis)

    @emojis = CustomEmoji.from_text(content_plain, account.domain)
  end

  private

  def update_room_timestamp
    dm_chat_room.update(last_message_at: created_at)
  end

  def mark_others_unread
    affected_account_ids = dm_chat_room.dm_chat_room_accounts
      .active
      .where.not(account_id: account_id)
      .pluck(:account_id)

    dm_chat_room.dm_chat_room_accounts
      .active
      .where.not(account_id: account_id)
      .update_all(unread: true) # rubocop:disable Rails/SkipsModelValidations

    # Invalidate unread count cache for affected accounts
    affected_account_ids.each do |aid|
      redis.del("dm:unread:#{aid}")
    end
  end

  def push_to_streaming
    PushDmMessageWorker.perform_async(id)
  end
end
