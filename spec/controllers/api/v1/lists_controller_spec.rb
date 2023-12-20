# frozen_string_literal: true

require 'rails_helper'

describe Api::V1::ListsController do
  render_views

  let(:user) { Fabricate(:user) }
  let(:list) { Fabricate(:list, account: user.account) }

  before do
    allow(controller).to receive(:doorkeeper_token) { token }
  end

  context 'with a user context' do
    let(:token) { Fabricate(:accessible_access_token, resource_owner_id: user.id, scopes: 'read:lists') }

    describe 'GET #show' do
      it 'returns http success' do
        get :show, params: { id: list.id }
        expect(response).to have_http_status(200)
      end
    end

    describe 'GET #index' do
      it 'returns http success' do
        list_id = list.id.to_s
        Fabricate(:list)
        get :index
        expect(response).to have_http_status(200)

        list_ids = body_as_json.pluck(:id)
        expect(list_ids.size).to eq 1
        expect(list_ids).to include list_id
      end
    end
  end

  context 'with the wrong user context' do
    let(:other_user) { Fabricate(:user) }
    let(:token)      { Fabricate(:accessible_access_token, resource_owner_id: other_user.id, scopes: 'read') }

    describe 'GET #show' do
      it 'returns http not found' do
        get :show, params: { id: list.id }
        expect(response).to have_http_status(404)
      end
    end
  end

  context 'without a user context' do
    let(:token) { Fabricate(:accessible_access_token, resource_owner_id: nil, scopes: 'read') }

    describe 'GET #show' do
      it 'returns http unprocessable entity' do
        get :show, params: { id: list.id }

        expect(response).to have_http_status(422)
        expect(response.headers['Link']).to be_nil
      end
    end
  end
end
