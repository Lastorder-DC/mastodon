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

    if params.key?(:protected_account)
      if ActiveModel::Type::Boolean.new.cast(params[:protected_account])
        merged_params[:locked] = true
        merged_params[:protected_account] = true
        current_user.settings['default_privacy'] = 'private'
      else
        merged_params[:locked] = false
        merged_params[:protected_account] = false
        current_user.settings['default_privacy'] = 'unlisted'
      end

      ActiveRecord::Base.transaction do
        current_user.save!
        UpdateAccountService.new.call(@account, merged_params, raise_error: true)
      end
    elsif @account.protected_account
      merged_params.delete(:locked)
      UpdateAccountService.new.call(@account, merged_params, raise_error: true)
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
      attribution_domains: [],
      fields_attributes: [:name, :value]
    )
  end
end
