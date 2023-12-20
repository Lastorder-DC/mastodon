# frozen_string_literal: true

class AddExcludeOptionsToFilters < ActiveRecord::Migration[6.1]
  def change
    safety_assured do
      add_column :custom_filters, :exclude_follows, :boolean, null: false, default: false
      add_column :custom_filters, :exclude_localusers, :boolean, null: false, default: false
      change_column_default :custom_filter_keywords, :whole_word, from: true, to: false
    end
  end
end
