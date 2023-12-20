# frozen_string_literal: true

require 'rails_helper'

describe Api::V1::Circles::StatusesController do
  render_views

  let(:user)  { Fabricate(:user) }
  let(:token) { Fabricate(:accessible_access_token, resource_owner_id: user.id, scopes: 'read:lists') }
  let(:circle) { Fabricate(:circle, account: user.account) }
  let(:status) { Fabricate(:status, account: user.account, visibility: 'limited', limited_scope: 'circle') }

  before do
    allow(controller).to receive(:doorkeeper_token) { token }
    Fabricate(:circle_status, status: status, circle: circle)
    other_circle = Fabricate(:circle)
    Fabricate(:circle_status, status: Fabricate(:status, visibility: 'limited', limited_scope: 'circle', account: other_circle.account), circle: other_circle)
  end

  describe 'GET #index' do
    it 'returns http success' do
      get :show, params: { circle_id: circle.id, limit: 5 }

      expect(response).to have_http_status(200)
      json = body_as_json
      expect(json.map { |item| item[:id].to_i }).to eq [status.id]
    end

    context "with someone else's statuses" do
      let(:other_account)  { Fabricate(:account) }
      let(:other_circle)   { Fabricate(:circle, account: other_account) }

      before do
        Fabricate(:circle_status, circle: other_circle, status: Fabricate(:status, account: other_account, visibility: 'limited', limited_scope: 'circle'))
      end

      it 'returns http failed' do
        get :show, params: { circle_id: other_circle.id }
        expect(response).to have_http_status(404)
      end
    end
  end
end
