# frozen_string_literal: true

class AntennasController < ApplicationController
  layout 'admin'

  before_action :authenticate_user!
  before_action :set_antenna, only: [:edit, :update, :destroy]
  before_action :set_body_classes
  before_action :set_cache_headers

  def index
    @antennas = current_account.antennas.includes(:antenna_domains).includes(:antenna_tags).includes(:antenna_accounts)
  end

  def edit; end

  def update
    if @antenna.update(resource_params)
      redirect_to antennas_path
    else
      render action: :edit
    end
  end

  def destroy
    @antenna.destroy
    redirect_to antennas_path
  end

  private

  def set_antenna
    @antenna = current_account.antennas.find(params[:id])
  end

  def resource_params
    params.require(:antenna).permit(:title, :available, :expires_in)
  end

  def thin_resource_params
    params.require(:antenna).permit(:title)
  end

  def set_body_classes
    @body_classes = 'admin'
  end

  def set_cache_headers
    response.cache_control.replace(private: true, no_store: true)
  end
end
