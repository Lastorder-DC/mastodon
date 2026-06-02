# frozen_string_literal: true

class CommunityGroupReport < ApplicationRecord
  COMMENT_SIZE_LIMIT = 1_000

  include Paginable
  include RateLimitable

  rate_limit by: :account, family: :reports

  belongs_to :community_group
  belongs_to :account
  belongs_to :target_account, class_name: 'Account'
  belongs_to :action_taken_by_account, class_name: 'Account', optional: true

  has_many :notifications, as: :activity, dependent: :destroy

  scope :unresolved, -> { where(action_taken_at: nil) }
  scope :resolved, -> { where.not(action_taken_at: nil) }

  validates :comment, presence: true, length: { maximum: COMMENT_SIZE_LIMIT }
  validates :status_ids, presence: true
  validate :group_rules_not_supported_yet
  validate :reporter_must_be_group_member
  validate :statuses_must_belong_to_group_and_target

  def statuses
    Status.with_discarded.where(id: status_ids)
  end

  def action_taken?
    action_taken_at.present?
  end

  alias action_taken action_taken?

  def resolve!(acting_account)
    update!(action_taken_at: Time.current, action_taken_by_account: acting_account)
  end

  def unresolve!
    update!(action_taken_at: nil, action_taken_by_account: nil)
  end

  private

  def group_rules_not_supported_yet
    errors.add(:rule_ids, I18n.t('community_group_reports.errors.rule_ids_not_supported')) if rule_ids.present?
  end

  def reporter_must_be_group_member
    errors.add(:account, I18n.t('community_groups.errors.not_a_member')) unless community_group&.member?(account)
  end

  def statuses_must_belong_to_group_and_target
    reported_statuses = Status.with_discarded.where(id: status_ids)

    if reported_statuses.size != status_ids.uniq.size
      errors.add(:status_ids, I18n.t('community_group_reports.errors.invalid_statuses'))
      return
    end

    errors.add(:status_ids, I18n.t('community_group_reports.errors.invalid_statuses')) if reported_statuses.any? { |status| status.community_group_id != community_group_id || status.account_id != target_account_id }
  end
end
