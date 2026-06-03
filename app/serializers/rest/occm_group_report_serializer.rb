# frozen_string_literal: true

class REST::OccmGroupReportSerializer < ActiveModel::Serializer
  attributes :id, :occm_group_id, :status_ids, :comment,
             :category, :action_taken_at, :created_at

  belongs_to :account, serializer: REST::AccountSerializer
  belongs_to :target_account, serializer: REST::AccountSerializer
  belongs_to :action_taken_by_account, serializer: REST::AccountSerializer

  def id
    object.id.to_s
  end

  def occm_group_id
    object.occm_group_id.to_s
  end

  def status_ids
    object.status_ids.map(&:to_s)
  end
end
