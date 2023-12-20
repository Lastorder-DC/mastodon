# frozen_string_literal: true

class REST::StatusInternalSerializer < REST::StatusSerializer
  attributes :reference_texts

  def reference_texts
    object.references.pluck(:text)
  end
end
