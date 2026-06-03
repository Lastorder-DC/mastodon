# frozen_string_literal: true

class REST::OccmGroupSerializer < ActiveModel::Serializer
  attributes :id, :title, :description, :approval_required,
             :member_count, :role, :membership_state, :created_at

  def id
    object.id.to_s
  end

  def role
    membership&.role
  end

  def membership_state
    membership&.state
  end

  private

  def membership
    if instance_options[:memberships_map]
      instance_options[:memberships_map][object.id]
    else
      @membership ||= object.occm_group_memberships.find_by(account: instance_options[:current_account])
    end
  end
end
