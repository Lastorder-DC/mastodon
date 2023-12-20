# frozen_string_literal: true

class AddLicenseToCustomEmojis < ActiveRecord::Migration[6.1]
  def change
    add_column :custom_emojis, :license, :string, null: true
  end
end
