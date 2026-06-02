# frozen_string_literal: true

class REST::CommunityGroupInvitationSerializer < ActiveModel::Serializer
  attributes :id, :token, :status, :expires_at, :created_at
  belongs_to :invitee_account, key: :account, serializer: REST::AccountSerializer

  def id
    object.id.to_s
  end
end
