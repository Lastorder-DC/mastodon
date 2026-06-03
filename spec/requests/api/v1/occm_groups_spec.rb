# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'OccmGroups' do
  let(:user) { Fabricate(:user) }
  let(:token) { Fabricate(:accessible_access_token, resource_owner_id: user.id, scopes: scopes) }
  let(:scopes) { 'read:occm_groups write:occm_groups' }
  let(:headers) { { 'Authorization' => "Bearer #{token.token}" } }
  let(:account) { user.account }

  describe 'GET /api/v1/occm_groups' do
    let!(:group) { Fabricate(:occm_group, account: account) }

    before do
      Fabricate(:occm_group_membership, occm_group: group, account: account, role: 'admin', state: 'active')
      get '/api/v1/occm_groups', headers: headers
    end

    it 'returns http success' do
      expect(response).to have_http_status(200)
    end

    it 'returns the user groups' do
      expect(response.parsed_body).to be_an(Array)
      expect(response.parsed_body.first[:id]).to eq(group.id.to_s)
    end

    context 'without authorization' do
      let(:headers) { {} }

      it 'returns http unauthorized' do
        expect(response).to have_http_status(401)
      end
    end
  end

  describe 'GET /api/v1/occm_groups/:id' do
    let(:group) { Fabricate(:occm_group, account: account) }

    before do
      get "/api/v1/occm_groups/#{group.id}", headers: headers
    end

    it 'returns http success' do
      expect(response).to have_http_status(200)
    end

    it 'returns the group data' do
      expect(response.parsed_body[:id]).to eq(group.id.to_s)
      expect(response.parsed_body[:title]).to eq(group.title)
    end

    context 'with a non-existent group' do
      before do
        get '/api/v1/occm_groups/-1', headers: headers
      end

      it 'returns http not found' do
        expect(response).to have_http_status(404)
      end
    end
  end

  describe 'POST /api/v1/occm_groups' do
    let(:params) { { title: 'New Group', description: 'A test group' } }

    it 'creates a group' do
      post '/api/v1/occm_groups', headers: headers, params: params
      expect(response).to have_http_status(200)
      expect(response.parsed_body[:title]).to eq('New Group')
    end

    it 'creates group with admin membership' do
      post '/api/v1/occm_groups', headers: headers, params: params
      group = OccmGroup.find(response.parsed_body[:id])
      membership = group.occm_group_memberships.find_by(account: account)
      expect(membership.role_admin?).to be true
    end

    context 'with invalid params' do
      it 'returns http unprocessable entity when title is blank' do
        post '/api/v1/occm_groups', headers: headers, params: { title: '' }
        expect(response).to have_http_status(422)
      end
    end
  end

  describe 'PUT /api/v1/occm_groups/:id' do
    let(:group) { Fabricate(:occm_group, account: account) }

    before do
      Fabricate(:occm_group_membership, occm_group: group, account: account, role: 'admin', state: 'active')
    end

    it 'updates the group when user is admin' do
      put "/api/v1/occm_groups/#{group.id}", headers: headers, params: { title: 'Updated' }
      expect(response).to have_http_status(200)
      expect(response.parsed_body[:title]).to eq('Updated')
    end

    context 'when not an admin' do
      let(:other_user) { Fabricate(:user) }
      let(:other_token) { Fabricate(:accessible_access_token, resource_owner_id: other_user.id, scopes: scopes) }
      let(:other_headers) { { 'Authorization' => "Bearer #{other_token.token}" } }

      before do
        Fabricate(:occm_group_membership, occm_group: group, account: other_user.account, role: 'user', state: 'active')
      end

      it 'returns http forbidden' do
        put "/api/v1/occm_groups/#{group.id}", headers: other_headers, params: { title: 'Nope' }
        expect(response).to have_http_status(403)
      end
    end
  end

  describe 'DELETE /api/v1/occm_groups/:id' do
    let(:group) { Fabricate(:occm_group, account: account) }

    before do
      Fabricate(:occm_group_membership, occm_group: group, account: account, role: 'admin', state: 'active')
    end

    it 'destroys the group when user is admin' do
      delete "/api/v1/occm_groups/#{group.id}", headers: headers
      expect(response).to have_http_status(200)
      expect(OccmGroup.find_by(id: group.id)).to be_nil
    end

    context 'when not an admin' do
      let(:other_user) { Fabricate(:user) }
      let(:other_token) { Fabricate(:accessible_access_token, resource_owner_id: other_user.id, scopes: scopes) }
      let(:other_headers) { { 'Authorization' => "Bearer #{other_token.token}" } }

      before do
        Fabricate(:occm_group_membership, occm_group: group, account: other_user.account, role: 'user', state: 'active')
      end

      it 'returns http forbidden' do
        delete "/api/v1/occm_groups/#{group.id}", headers: other_headers
        expect(response).to have_http_status(403)
      end
    end
  end

  describe 'POST /api/v1/occm_groups/:id/transfer' do
    let(:group) { Fabricate(:occm_group, account: account) }
    let(:target_account) { Fabricate(:account) }

    before do
      Fabricate(:occm_group_membership, occm_group: group, account: account, role: 'admin', state: 'active')
      Fabricate(:occm_group_membership, occm_group: group, account: target_account, role: 'user', state: 'active')
    end

    it 'transfers admin to target account' do
      post "/api/v1/occm_groups/#{group.id}/transfer", headers: headers, params: { account_id: target_account.id }
      expect(response).to have_http_status(200)
      expect(group.reload.account_id).to eq(target_account.id)
    end

    context 'when not an admin' do
      let(:other_user) { Fabricate(:user) }
      let(:other_token) { Fabricate(:accessible_access_token, resource_owner_id: other_user.id, scopes: scopes) }
      let(:other_headers) { { 'Authorization' => "Bearer #{other_token.token}" } }

      before do
        Fabricate(:occm_group_membership, occm_group: group, account: other_user.account, role: 'user', state: 'active')
      end

      it 'returns http forbidden' do
        post "/api/v1/occm_groups/#{group.id}/transfer", headers: other_headers, params: { account_id: target_account.id }
        expect(response).to have_http_status(403)
      end
    end
  end
end
