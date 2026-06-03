# frozen_string_literal: true

class REST::OccmGroupMembershipSerializer < ActiveModel::Serializer
  attributes :id, :role, :state, :created_at

  belongs_to :account, serializer: REST::AccountSerializer

  def id
    object.id.to_s
  end
end
