# frozen_string_literal: true

class RemoveStopEmojiReactionStreamingFromAccounts < ActiveRecord::Migration[6.1]
  def up
    safety_assured do
      remove_column :accounts, :stop_emoji_reaction_streaming
    end
  end

  def down
    safety_assured do
      add_column :accounts, :stop_emoji_reaction_streaming, :boolean, null: true, default: false
    end
  end
end
