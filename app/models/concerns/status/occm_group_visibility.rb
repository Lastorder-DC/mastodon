# frozen_string_literal: true

module Status::OccmGroupVisibility
  extend ActiveSupport::Concern

  included do
    scope :excluding_occm_group_posts, lambda {
      where(
        'NOT EXISTS (SELECT 1 FROM occm_group_statuses WHERE occm_group_statuses.status_id = statuses.id)'
      )
    }
  end

  def visible_to_occm_group_member?(account)
    return true if occm_group_status.blank?

    occm_group_status.occm_group.occm_group_memberships.active.exists?(account_id: account.id)
  end
end
