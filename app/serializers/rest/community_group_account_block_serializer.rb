# frozen_string_literal: true

class REST::CommunityGroupAccountBlockSerializer < ActiveModel::Serializer
  attributes :id, :reason, :created_at
  belongs_to :account, serializer: REST::AccountSerializer

  def id
    object.id.to_s
  end
end
