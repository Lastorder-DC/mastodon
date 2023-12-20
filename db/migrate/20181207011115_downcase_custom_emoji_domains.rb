# frozen_string_literal: true

class DowncaseCustomEmojiDomains < ActiveRecord::Migration[5.2]
  disable_ddl_transaction!

  def up
    CustomEmoji.connection.execute('CREATE TABLE IF NOT EXISTS emoji_reactions (id integer, custom_emoji_id integer, created_at timestamp NOT NULL, updated_at timestamp NOT NULL)')

    duplicates = CustomEmoji.connection.select_all('SELECT string_agg(id::text, \',\') AS ids FROM custom_emojis GROUP BY shortcode, lower(domain) HAVING count(*) > 1').to_ary

    duplicates.each do |row|
      CustomEmoji.where(id: row['ids'].split(',')[0...-1]).destroy_all
    end

    CustomEmoji.in_batches.update_all('domain = lower(domain)')

    CustomEmoji.connection.execute('DROP TABLE IF EXISTS emoji_reactions')
  end

  def down; end
end
