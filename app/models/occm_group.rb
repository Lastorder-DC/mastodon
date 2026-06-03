# frozen_string_literal: true

# == Schema Information
#
# Table name: occm_groups
#
#  id                :bigint(8)        not null, primary key
#  title             :string           default(""), not null
#  description       :text             default(""), not null
#  account_id        :bigint(8)        not null
#  approval_required :boolean          default(TRUE), not null
#  member_count      :integer          default(0), not null
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#

class OccmGroup < ApplicationRecord
  include Paginable

  GROUP_LIMIT = 50

  belongs_to :account

  has_many :occm_group_memberships, dependent: :destroy
  has_many :members, through: :occm_group_memberships, source: :account
  has_many :occm_group_statuses, dependent: :destroy
  has_many :occm_group_reports, dependent: :destroy

  validates :title, presence: true, length: { maximum: 100 }
  validates :description, length: { maximum: 500 }

  validate :validate_group_limit, on: :create

  private

  def validate_group_limit
    errors.add(:base, I18n.t('occm_groups.errors.limit')) if account.occm_groups.count >= GROUP_LIMIT
  end
end
