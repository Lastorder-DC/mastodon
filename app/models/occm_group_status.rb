# frozen_string_literal: true

# == Schema Information
#
# Table name: occm_group_statuses
#
#  id            :bigint(8)        not null, primary key
#  occm_group_id :bigint(8)        not null
#  status_id     :bigint(8)        not null
#  account_id    :bigint(8)        not null
#  created_at    :datetime         not null
#

class OccmGroupStatus < ApplicationRecord
  include Paginable

  belongs_to :occm_group
  belongs_to :status
  belongs_to :account

  validates :status_id, uniqueness: { scope: :occm_group_id }
end
