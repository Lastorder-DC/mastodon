# frozen_string_literal: true

class MultiAccounts::CallbacksController < ApplicationController
  skip_before_action :verify_authenticity_token
  before_action :authenticate_user!

  content_security_policy do |p|
    p.script_src :self, :unsafe_inline
  end

  after_action :set_script_nonce_directive

  def show
    @state = params.require(:state)
    @code = params.require(:code)

    data = MultiAccounts::StateStore.fetch(@state)

    if data.blank?
      render_error('Authentication session has expired or is invalid. Please try again.')
      return
    end

    @redirect_uri = data[:redirect_uri]
    @redirect_origin =
      begin
        uri = Addressable::URI.parse(@redirect_uri)
        uri.port && uri.port != uri.default_port ? "#{uri.scheme}://#{uri.host}:#{uri.port}" : "#{uri.scheme}://#{uri.host}"
      rescue Addressable::URI::InvalidURIError, TypeError
        nil
      end
  rescue ActionController::ParameterMissing => e
    render_error("Missing required parameter: #{e.param}")
  rescue StandardError => e
    Rails.logger.error("Multi-account OAuth callback error: #{e.message}")
    Rails.logger.error(e.backtrace.join("\n"))
    render_error('An error occurred while adding the account. Please try again.')
  end

  private

  def set_script_nonce_directive
    request.content_security_policy_nonce_directives = %w(script-src)
  end

  def render_error(message)
    @error = message
    render :show, status: :bad_request
  end
end
