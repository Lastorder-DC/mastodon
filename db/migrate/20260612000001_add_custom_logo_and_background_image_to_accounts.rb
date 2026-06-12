# frozen_string_literal: true

class AddCustomLogoAndBackgroundImageToAccounts < ActiveRecord::Migration[8.0]
  def change
    add_column :accounts, :custom_logo_file_name, :string
    add_column :accounts, :custom_logo_content_type, :string
    add_column :accounts, :custom_logo_file_size, :integer
    add_column :accounts, :custom_logo_updated_at, :datetime
    add_column :accounts, :custom_logo_description, :string, null: false, default: ''
    add_column :accounts, :custom_logo_enabled, :boolean, null: false, default: false

    add_column :accounts, :background_image_file_name, :string
    add_column :accounts, :background_image_content_type, :string
    add_column :accounts, :background_image_file_size, :integer
    add_column :accounts, :background_image_updated_at, :datetime
    add_column :accounts, :background_image_enabled, :boolean, null: false, default: false
  end
end
