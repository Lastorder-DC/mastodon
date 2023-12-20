# frozen_string_literal: true

class NgWordsPolicy < ApplicationPolicy
  def show?
    role.can?(:manage_ng_words)
  end

  def create?
    role.can?(:manage_ng_words)
  end
end
