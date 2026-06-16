# frozen_string_literal: true

class Api::V1::Profile::CustomLogosController < Api::BaseController
  before_action -> { doorkeeper_authorize! :write, :'write:accounts' }
  before_action :require_user!

  def destroy
    @account = current_account

    if @account.custom_branding_source_account_id.present?
      render json: { error: I18n.t('invites.force_custom_branding_restricted') }, status: 403
      return
    end

    UpdateAccountService.new.call(@account, { custom_logo: nil }, raise_error: true)
    ActivityPub::UpdateDistributionWorker.perform_in(ActivityPub::UpdateDistributionWorker::DEBOUNCE_DELAY, @account.id)
    render json: @account, serializer: REST::CredentialAccountSerializer
  end
end
