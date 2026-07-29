# frozen_string_literal: true

class Api::V1::ProfilesController < Api::BaseController
  before_action -> { doorkeeper_authorize! :profile, :read, :'read:accounts' }, except: [:update]
  before_action -> { doorkeeper_authorize! :write, :'write:accounts' }, only: [:update]
  before_action :require_user!

  def show
    @account = current_account
    render json: @account, serializer: REST::ProfileSerializer
  end

  def update
    @account = current_account
    merged_params = account_params.to_h

    # Prevent modifying custom branding when forced by invite
    if @account.custom_branding_source_account_id.present?
      merged_params.delete('custom_logo')
      merged_params.delete('custom_logo_description')
      merged_params.delete('custom_logo_enabled')
      merged_params.delete('background_image')
      merged_params.delete('background_image_enabled')
    end

    protected_account_changed = merged_params.key?('protected_account')
    protected_account_enabled = ActiveModel::Type::Boolean.new.cast(merged_params['protected_account']) if protected_account_changed

    if protected_account_changed
      merged_params['protected_account'] = protected_account_enabled
      merged_params['locked'] = protected_account_enabled

      ActiveRecord::Base.transaction do
        UpdateAccountService.new.call(@account, merged_params, raise_error: true)

        unless protected_account_enabled
          current_user.settings['default_privacy'] = 'unlisted'
          current_user.save!
        end
      end
    else
      UpdateAccountService.new.call(@account, merged_params, raise_error: true)
    end

    ActivityPub::UpdateDistributionWorker.perform_in(ActivityPub::UpdateDistributionWorker::DEBOUNCE_DELAY, @account.id)

    render json: @account, serializer: REST::ProfileSerializer
  rescue ActiveRecord::RecordInvalid => e
    render json: ValidationErrorFormatter.new(e).as_json, status: 422
  end

  def account_params
    params.permit(
      :display_name,
      :note,
      :avatar,
      :avatar_description,
      :header,
      :header_description,
      :locked,
      :bot,
      :discoverable,
      :hide_collections,
      :indexable,
      :show_media,
      :show_media_replies,
      :show_featured,
      :protected_account,
      :custom_logo,
      :custom_logo_description,
      :custom_logo_enabled,
      :background_image,
      :background_image_enabled,
      attribution_domains: [],
      fields_attributes: [:name, :value]
    )
  end
end
