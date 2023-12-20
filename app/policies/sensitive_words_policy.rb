# frozen_string_literal: true

class SensitiveWordsPolicy < ApplicationPolicy
  def show?
    role.can?(:manage_sensitive_words)
  end

  def create?
    role.can?(:manage_sensitive_words)
  end
end
