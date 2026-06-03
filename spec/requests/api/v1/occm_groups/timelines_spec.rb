# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'OccmGroups Timelines' do
  let(:user) { Fabricate(:user) }
  let(:token) { Fabricate(:accessible_access_token, resource_owner_id: user.id, scopes: scopes) }
  let(:scopes) { 'read:occm_groups write:occm_groups' }
  let(:headers) { { 'Authorization' => "Bearer #{token.token}" } }
  let(:account) { user.account }
  let(:group) { Fabricate(:occm_group, account: account) }

  before do
    Fabricate(:occm_group_membership, occm_group: group, account: account, role: 'admin', state: 'active')
  end

  describe 'GET /api/v1/occm_groups/:occm_group_id/timeline' do
    let(:first_status) { Fabricate(:status, account: account) }
    let(:second_status) { Fabricate(:status, account: account) }

    before do
      Fabricate(:occm_group_status, occm_group: group, status: first_status, account: account)
      Fabricate(:occm_group_status, occm_group: group, status: second_status, account: account)
      get "/api/v1/occm_groups/#{group.id}/timeline", headers: headers
    end

    it 'returns http success' do
      expect(response).to have_http_status(200)
    end

    it 'returns statuses in the group timeline' do
      ids = response.parsed_body.pluck(:id)
      expect(ids).to include(first_status.id.to_s, second_status.id.to_s)
    end

    context 'when not an active member' do
      let(:non_member_user) { Fabricate(:user) }
      let(:non_member_token) { Fabricate(:accessible_access_token, resource_owner_id: non_member_user.id, scopes: scopes) }
      let(:non_member_headers) { { 'Authorization' => "Bearer #{non_member_token.token}" } }

      it 'returns http not found' do
        get "/api/v1/occm_groups/#{group.id}/timeline", headers: non_member_headers
        expect(response).to have_http_status(404)
      end
    end

    context 'with pagination params' do
      it 'respects limit parameter' do
        get "/api/v1/occm_groups/#{group.id}/timeline", headers: headers, params: { limit: 1 }
        expect(response).to have_http_status(200)
        expect(response.parsed_body.size).to eq(1)
      end
    end
  end
end
