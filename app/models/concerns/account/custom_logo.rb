# frozen_string_literal: true

module Account::CustomLogo
  extend ActiveSupport::Concern

  MAX_DESCRIPTION_LENGTH = 150
  CUSTOM_LOGO_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].freeze
  CUSTOM_LOGO_LIMIT = 8.megabytes
  CUSTOM_LOGO_DIMENSIONS = [522, 132].freeze
  CUSTOM_LOGO_GEOMETRY = [CUSTOM_LOGO_DIMENSIONS.first, CUSTOM_LOGO_DIMENSIONS.last].join('x')

  class_methods do
    def custom_logo_styles(file)
      styles = { original: { geometry: "#{CUSTOM_LOGO_GEOMETRY}>", file_geometry_parser: FastGeometryParser } }
      styles[:static] = { geometry: "#{CUSTOM_LOGO_GEOMETRY}>", format: 'png', convert_options: '-coalesce', file_geometry_parser: FastGeometryParser } if file.content_type == 'image/gif'
      styles
    end

    private :custom_logo_styles
  end

  included do
    # Custom logo upload
    has_attached_file :custom_logo, styles: ->(f) { custom_logo_styles(f) }, convert_options: { all: '+profile "!icc,*" +set date:modify +set date:create +set date:timestamp' }, processors: [:lazy_thumbnail]
    validates_attachment_content_type :custom_logo, content_type: CUSTOM_LOGO_IMAGE_MIME_TYPES
    validates_attachment_size :custom_logo, less_than: CUSTOM_LOGO_LIMIT
    remotable_attachment :custom_logo, CUSTOM_LOGO_LIMIT, suppress_errors: false

    validates :custom_logo_description, length: { maximum: MAX_DESCRIPTION_LENGTH }, if: -> { local? && will_save_change_to_custom_logo_description? }
  end

  def custom_logo_original_url
    custom_logo.url(:original)
  end

  def custom_logo_static_url
    custom_logo_content_type == 'image/gif' ? custom_logo.url(:static) : custom_logo_original_url
  end
end
