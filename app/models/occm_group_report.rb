# frozen_string_literal: true

# == Schema Information
#
# Table name: occm_group_reports
#
#  id                          :bigint(8)        not null, primary key
#  occm_group_id               :bigint(8)        not null
#  account_id                  :bigint(8)        not null
#  target_account_id           :bigint(8)        not null
#  status_ids                  :bigint(8)        default([]), not null, is an Array
#  comment                     :text             default(""), not null
#  category                    :integer          default("other"), not null
#  action_taken_at             :datetime
#  action_taken_by_account_id  :bigint(8)
#  created_at                  :datetime         not null
#  updated_at                  :datetime         not null
#

class OccmGroupReport < ApplicationRecord
  belongs_to :occm_group
  belongs_to :account
  belongs_to :target_account, class_name: 'Account'
  belongs_to :action_taken_by_account, class_name: 'Account', optional: true

  enum :category, { other: 0, spam: 1, harassment: 2, off_topic: 3, rule_violation: 4 }, prefix: true

  validates :comment, length: { maximum: 1000 }

  scope :unresolved, -> { where(action_taken_at: nil) }
  scope :resolved, -> { where.not(action_taken_at: nil) }
end
