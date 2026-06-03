# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'OccmGroups Statuses' do
  let(:user) { Fabricate(:user) }
  let(:token) { Fabricate(:accessible_access_token, resource_owner_id: user.id, scopes: scopes) }
  let(:scopes) { 'read:occm_groups write:occm_groups' }
  let(:headers) { { 'Authorization' => "Bearer #{token.token}" } }
  let(:account) { user.account }
  let(:group) { Fabricate(:occm_group, account: account) }

  before do
    Fabricate(:occm_group_membership, occm_group: group, account: account, role: 'admin', state: 'active')
  end

  describe 'POST /api/v1/occm_groups/:occm_group_id/statuses' do
    let(:status) { Fabricate(:status, account: account) }

    before do
      post_service = instance_double(PostStatusService, call: status)
      allow(PostStatusService).to receive(:new).and_return(post_service)
      distribute_service = instance_double(DistributeOccmGroupStatusService, call: nil)
      allow(DistributeOccmGroupStatusService).to receive(:new).and_return(distribute_service)
    end

    it 'creates a status in the group' do
      post "/api/v1/occm_groups/#{group.id}/statuses", headers: headers, params: { status: 'Hello group!' }
      expect(response).to have_http_status(200)
    end

    context 'when not an active member' do
      let(:non_member_user) { Fabricate(:user) }
      let(:non_member_token) { Fabricate(:accessible_access_token, resource_owner_id: non_member_user.id, scopes: scopes) }
      let(:non_member_headers) { { 'Authorization' => "Bearer #{non_member_token.token}" } }

      it 'returns http forbidden' do
        post "/api/v1/occm_groups/#{group.id}/statuses", headers: non_member_headers, params: { status: 'Not allowed' }
        expect(response).to have_http_status(403)
      end
    end
  end

  describe 'DELETE /api/v1/occm_groups/:occm_group_id/statuses/:id' do
    let(:status) { Fabricate(:status, account: account) }

    before do
      Fabricate(:occm_group_status, occm_group: group, status: status, account: account)
      delete_service = instance_double(DeleteOccmGroupStatusService, call: nil)
      allow(DeleteOccmGroupStatusService).to receive(:new).and_return(delete_service)
    end

    it 'deletes the status when user is admin' do
      delete "/api/v1/occm_groups/#{group.id}/statuses/#{status.id}", headers: headers
      expect(response).to have_http_status(200)
    end

    context 'when user is a regular member' do
      let(:regular_user) { Fabricate(:user) }
      let(:regular_token) { Fabricate(:accessible_access_token, resource_owner_id: regular_user.id, scopes: scopes) }
      let(:regular_headers) { { 'Authorization' => "Bearer #{regular_token.token}" } }

      before do
        Fabricate(:occm_group_membership, occm_group: group, account: regular_user.account, role: 'user', state: 'active')
      end

      it 'returns http forbidden' do
        delete "/api/v1/occm_groups/#{group.id}/statuses/#{status.id}", headers: regular_headers
        expect(response).to have_http_status(403)
      end
    end
  end
end
