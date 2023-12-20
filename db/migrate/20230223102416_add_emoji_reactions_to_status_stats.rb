# frozen_string_literal: true

class AddEmojiReactionsToStatusStats < ActiveRecord::Migration[6.1]
  def change
    add_column :status_stats, :emoji_reactions, :string
  end
end
