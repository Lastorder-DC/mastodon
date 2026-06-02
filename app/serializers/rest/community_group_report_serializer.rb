# frozen_string_literal: true

class REST::CommunityGroupReportSerializer < ActiveModel::Serializer
  attributes :id, :action_taken, :action_taken_at, :comment, :created_at, :status_ids, :rule_ids

  belongs_to :account, serializer: REST::AccountSerializer
  belongs_to :target_account, serializer: REST::AccountSerializer
  belongs_to :community_group, serializer: REST::CommunityGroupSerializer

  def id
    object.id.to_s
  end

  def status_ids
    object.status_ids.map(&:to_s)
  end

  def rule_ids
    object.rule_ids.map(&:to_s)
  end
end
