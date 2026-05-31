# frozen_string_literal: true

class OAuth::AuthorizationsController < Doorkeeper::AuthorizationsController
  skip_before_action :authenticate_resource_owner!

  prepend_before_action :store_current_location
  before_action :handle_multi_account_force_login
  before_action :authenticate_resource_owner!

  layout 'modal'

  content_security_policy do |p|
    p.form_action(false)
  end

  include Localized

  private

  def store_current_location
    store_location_for(:user, request.url)
  end

  def can_authorize_response?
    !truthy_param?('force_login') && super
  end

  def truthy_param?(key)
    ActiveModel::Type::Boolean.new.cast(params[key])
  end

  def mfa_setup_path
    super({ oauth: true })
  end

  # Multi-account: when force_login is requested and the current user is the
  # same user who initiated the multi-account flow, sign them out so they can
  # log in as a different account.
  def multi_account_force_login_requested?
    truthy_param?('force_login') || params[:prompt] == 'login'
  end

  def multi_account_state_data
    return @multi_account_state_data if defined?(@multi_account_state_data)

    state = params[:state]
    @multi_account_state_data =
      if state.present?
        MultiAccounts::StateStore.fetch(state)
      end
  rescue StandardError => e
    Rails.logger.warn("[MultiAccount] force login state fetch failed: #{e.message}")
    @multi_account_state_data = nil
  end

  def handle_multi_account_force_login
    return unless multi_account_force_login_requested?

    state_data = multi_account_state_data
    return if state_data.blank?
    return if state_data[:user_id].blank?

    # Only sign out if the currently logged-in user is the one who started
    # the multi-account flow (i.e. user A trying to add account B)
    return unless user_signed_in? && current_user.id == state_data[:user_id].to_i
    return if state_data[:force_login_performed]

    # Mark state so we don't loop forever
    MultiAccounts::StateStore.mark_force_login!(params[:state])
    @multi_account_state_data = state_data.merge(force_login_performed: true)

    # Sign out user A so they can log in as user B
    sign_out(:user)
    store_location_for(:user, request.original_fullpath)
    session[:multi_account_return_to] = request.original_fullpath
  end
end
