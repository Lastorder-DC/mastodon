# frozen_string_literal: true

module Status::OccmGroupVisibility
  extend ActiveSupport::Concern

  def visible_to_occm_group_member?(account)
    return true if occm_group_status.blank?

    occm_group_status.occm_group.occm_group_memberships.active.exists?(account_id: account.id)
  end
end
