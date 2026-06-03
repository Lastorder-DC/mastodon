# frozen_string_literal: true

# == Schema Information
#
# Table name: occm_group_dm_rooms
#
#  id            :bigint(8)        not null, primary key
#  occm_group_id :bigint(8)        not null
#  title         :string           default(""), not null
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#

class OccmGroupDmRoom < ApplicationRecord
  belongs_to :occm_group

  validates :title, presence: true, length: { maximum: 100 }
end
