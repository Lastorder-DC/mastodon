# frozen_string_literal: true

class AddAliasesToCustomEmoji < ActiveRecord::Migration[6.1]
  def change
    add_column :custom_emojis, :aliases, :jsonb
  end
end
