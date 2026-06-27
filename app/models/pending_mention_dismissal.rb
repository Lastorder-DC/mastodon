# frozen_string_literal: true

# == Schema Information
#
# Table name: pending_mention_dismissals
#
#  id              :bigint(8)        not null, primary key
#  created_at      :datetime         not null
#  account_id      :bigint(8)        not null
#  notification_id :bigint(8)        not null
#
class PendingMentionDismissal < ApplicationRecord
  belongs_to :account
  belongs_to :notification

  validates :account_id, uniqueness: { scope: :notification_id }
end
