# frozen_string_literal: true

class REST::CommunityGroupJoinRequestSerializer < ActiveModel::Serializer
  attributes :id, :message, :status, :created_at, :reviewed_at
  belongs_to :account, serializer: REST::AccountSerializer

  def id
    object.id.to_s
  end
end
