# frozen_string_literal: true

module Account::BackgroundImage
  extend ActiveSupport::Concern

  BACKGROUND_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].freeze
  BACKGROUND_IMAGE_LIMIT = 8.megabytes
  BACKGROUND_IMAGE_DIMENSIONS = [1920, 1080].freeze
  BACKGROUND_IMAGE_MAX_PIXELS = BACKGROUND_IMAGE_DIMENSIONS.first * BACKGROUND_IMAGE_DIMENSIONS.last

  class_methods do
    def background_image_styles(file)
      styles = { original: { pixels: BACKGROUND_IMAGE_MAX_PIXELS, file_geometry_parser: FastGeometryParser } }
      styles[:static] = { format: 'png', convert_options: '-coalesce', file_geometry_parser: FastGeometryParser } if file.content_type == 'image/gif'
      styles
    end

    private :background_image_styles
  end

  included do
    has_attached_file :background_image, styles: ->(f) { background_image_styles(f) }, convert_options: { all: '+profile "!icc,*" +set date:modify +set date:create +set date:timestamp' }, processors: [:lazy_thumbnail]
    validates_attachment_content_type :background_image, content_type: BACKGROUND_IMAGE_MIME_TYPES
    validates_attachment_size :background_image, less_than: BACKGROUND_IMAGE_LIMIT
    remotable_attachment :background_image, BACKGROUND_IMAGE_LIMIT, suppress_errors: false
  end

  def background_image_original_url
    background_image.url(:original)
  end

  def background_image_static_url
    background_image_content_type == 'image/gif' ? background_image.url(:static) : background_image_original_url
  end
end
