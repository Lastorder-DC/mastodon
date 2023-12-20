# frozen_string_literal: true

require 'rails_helper'

describe Api::V1::Timelines::AntennaController do
  render_views

  let(:user) { Fabricate(:user) }
  let(:antenna) { Fabricate(:antenna, account: user.account) }

  before do
    allow(controller).to receive(:doorkeeper_token) { token }
  end

  context 'with a user context' do
    let(:token) { Fabricate(:accessible_access_token, resource_owner_id: user.id, scopes: 'read:lists') }

    describe 'GET #show' do
      before do
        account = Fabricate(:account)
        antenna.antenna_accounts.create!(account: account)
        PostStatusService.new.call(account, text: 'New status for user home timeline.')
      end

      it 'returns http success' do
        get :show, params: { id: antenna.id }
        expect(response).to have_http_status(200)
      end
    end
  end

  context 'with the wrong user context' do
    let(:other_user) { Fabricate(:user) }
    let(:token)      { Fabricate(:accessible_access_token, resource_owner_id: other_user.id, scopes: 'read') }

    describe 'GET #show' do
      it 'returns http not found' do
        get :show, params: { id: antenna.id }
        expect(response).to have_http_status(404)
      end
    end
  end

  context 'without a user context' do
    let(:token) { Fabricate(:accessible_access_token, resource_owner_id: nil, scopes: 'read') }

    describe 'GET #show' do
      it 'returns http unprocessable entity' do
        get :show, params: { id: antenna.id }

        expect(response).to have_http_status(422)
        expect(response.headers['Link']).to be_nil
      end
    end
  end
end
