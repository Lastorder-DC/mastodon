# frozen_string_literal: true

class REST::AccountWarningSerializer < ActiveModel::Serializer
  attributes :id, :action, :text, :status_ids
end
