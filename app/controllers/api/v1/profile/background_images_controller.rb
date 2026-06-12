# frozen_string_literal: true

class Api::V1::Profile::BackgroundImagesController < Api::BaseController
  before_action -> { doorkeeper_authorize! :write, :'write:accounts' }
  before_action :require_user!

  def destroy
    @account = current_account
    UpdateAccountService.new.call(@account, { background_image: nil }, raise_error: true)
    ActivityPub::UpdateDistributionWorker.perform_in(ActivityPub::UpdateDistributionWorker::DEBOUNCE_DELAY, @account.id)
    render json: @account, serializer: REST::CredentialAccountSerializer
  end
end
