# frozen_string_literal: true

# == Schema Information
#
# Table name: occm_group_memberships
#
#  id            :bigint(8)        not null, primary key
#  occm_group_id :bigint(8)        not null
#  account_id    :bigint(8)        not null
#  role          :integer          default("user"), not null
#  state         :integer          default("pending"), not null
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#

class OccmGroupMembership < ApplicationRecord
  belongs_to :occm_group
  belongs_to :account

  enum :role, { admin: 0, moderator: 1, user: 2 }, prefix: true
  enum :state, { pending: 0, active: 1, rejected: 2 }, prefix: true

  validates :account_id, uniqueness: { scope: :occm_group_id }

  scope :active, -> { where(state: :active) }
  scope :pending, -> { where(state: :pending) }
  scope :admins, -> { where(role: :admin) }
  scope :moderators, -> { where(role: :moderator) }
  scope :with_moderation_role, -> { where(role: [:admin, :moderator]) }
end
