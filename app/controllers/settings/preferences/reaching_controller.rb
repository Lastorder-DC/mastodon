# frozen_string_literal: true

class Settings::Preferences::ReachingController < Settings::Preferences::BaseController
  private

  def after_update_redirect_path
    settings_preferences_reaching_path
  end
end
