# frozen_string_literal: true

class REST::CustomEmojiSlimSerializer < ActiveModel::Serializer
  include RoutingHelper

  # Please update `app/javascript/mastodon/api_types/custom_emoji.ts` when making changes to the attributes

  attributes :shortcode, :url, :static_url, :visible_in_picker

  attribute :category, if: :category_loaded?
  attribute :width, if: :width?
  attribute :height, if: :height?
  attribute :sensitive, if: :sensitive?
  attribute :is_sensitive, if: :sensitive?

  def url
    full_asset_url(object.image.url)
  end

  def static_url
    full_asset_url(object.image.url(:static))
  end

  def category
    object.category.name
  end

  def category_loaded?
    object.association(:category).loaded? && object.category.present?
  end

  def width?
    object.respond_to?(:image_width) || object.respond_to?(:width)
  end

  def height?
    object.respond_to?(:image_height) || object.respond_to?(:height)
  end

  def width
    object.respond_to?(:image_width) ? object.image_width : object.width
  end

  def height
    object.respond_to?(:image_height) ? object.image_height : object.height
  end

  def sensitive?
    object.respond_to?(:is_sensitive)
  end

  def sensitive
    object.is_sensitive
  end

  def is_sensitive # rubocop:disable Naming/PredicateName
    sensitive
  end
end
