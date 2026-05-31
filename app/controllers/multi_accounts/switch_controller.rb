# frozen_string_literal: true

class MultiAccounts::SwitchController < ApplicationController
  skip_before_action :verify_authenticity_token
  skip_before_action :require_functional!, if: -> { request.format.json? }

  def create
    token_value = params.require(:token)

    access_token = Doorkeeper::AccessToken.by_token(token_value)

    unless access_token
      render json: { error: 'Invalid token' }, status: :unauthorized
      return
    end

    if access_token.revoked?
      render json: { error: 'Token has been revoked' }, status: :unauthorized
      return
    end

    if access_token.expired?
      render json: { error: 'Token has expired' }, status: :unauthorized
      return
    end

    user = User.find_by(id: access_token.resource_owner_id)

    unless user
      render json: { error: 'User not found' }, status: :not_found
      return
    end

    if user.disabled? || user.account.suspended?
      render json: { error: 'Account is suspended or disabled' }, status: :forbidden
      return
    end

    # sign_in triggers Warden::Manager.after_set_user which creates
    # SessionActivation and sets the _session_id cookie
    sign_in(:user, user)

    render json: { success: true, account_id: user.account.id.to_s }
  rescue ActionController::ParameterMissing => e
    render json: { error: "Missing parameter: #{e.param}" }, status: :bad_request
  rescue StandardError => e
    Rails.logger.error("[MultiAccount::Switch] Unexpected error: #{e.message}")
    render json: { error: 'Internal server error' }, status: :internal_server_error
  end
end
