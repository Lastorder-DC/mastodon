# frozen_string_literal: true

class REST::CustomEmojiSerializer < REST::CustomEmojiSlimSerializer
  include RoutingHelper

  # Please update `app/javascript/mastodon/api_types/custom_emoji.ts` when making changes to the attributes

  attribute :aliases, if: :aliases?

  def aliases?
    object.respond_to?(:aliases) && object.aliases.present?
  end
end
