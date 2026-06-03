# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'OccmGroups Members' do
  let(:user) { Fabricate(:user) }
  let(:token) { Fabricate(:accessible_access_token, resource_owner_id: user.id, scopes: scopes) }
  let(:scopes) { 'read:occm_groups write:occm_groups' }
  let(:headers) { { 'Authorization' => "Bearer #{token.token}" } }
  let(:account) { user.account }
  let(:group) { Fabricate(:occm_group, account: account) }
  let!(:admin_membership) { Fabricate(:occm_group_membership, occm_group: group, account: account, role: 'admin', state: 'active') }

  describe 'GET /api/v1/occm_groups/:occm_group_id/members' do
    let!(:member_account) { Fabricate(:account) }
    let!(:member_membership) { Fabricate(:occm_group_membership, occm_group: group, account: member_account, role: 'user', state: 'active') }

    before do
      get "/api/v1/occm_groups/#{group.id}/members", headers: headers
    end

    it 'returns http success' do
      expect(response).to have_http_status(200)
    end

    it 'returns active members' do
      ids = response.parsed_body.pluck(:id)
      expect(ids).to include(admin_membership.id.to_s, member_membership.id.to_s)
    end
  end

  describe 'GET /api/v1/occm_groups/:occm_group_id/members/pending' do
    let!(:pending_account) { Fabricate(:account) }
    let!(:pending_membership) { Fabricate(:occm_group_membership, occm_group: group, account: pending_account, role: 'user', state: 'pending') }

    context 'when user is admin or moderator' do
      before do
        get "/api/v1/occm_groups/#{group.id}/members/pending", headers: headers
      end

      it 'returns http success' do
        expect(response).to have_http_status(200)
      end

      it 'returns pending memberships' do
        ids = response.parsed_body.pluck(:id)
        expect(ids).to include(pending_membership.id.to_s)
      end
    end

    context 'when user is a regular member' do
      let(:regular_user) { Fabricate(:user) }
      let(:regular_token) { Fabricate(:accessible_access_token, resource_owner_id: regular_user.id, scopes: scopes) }
      let(:regular_headers) { { 'Authorization' => "Bearer #{regular_token.token}" } }

      before do
        Fabricate(:occm_group_membership, occm_group: group, account: regular_user.account, role: 'user', state: 'active')
        get "/api/v1/occm_groups/#{group.id}/members/pending", headers: regular_headers
      end

      it 'returns http forbidden' do
        expect(response).to have_http_status(403)
      end
    end
  end

  describe 'POST /api/v1/occm_groups/:occm_group_id/members' do
    let(:new_user) { Fabricate(:user) }
    let(:new_token) { Fabricate(:accessible_access_token, resource_owner_id: new_user.id, scopes: scopes) }
    let(:new_headers) { { 'Authorization' => "Bearer #{new_token.token}" } }

    context 'when group does not require approval' do
      before { group.update!(approval_required: false) }

      it 'joins the group successfully' do
        post "/api/v1/occm_groups/#{group.id}/members", headers: new_headers
        expect(response).to have_http_status(200)
        membership = OccmGroupMembership.find_by(occm_group: group, account: new_user.account)
        expect(membership.state_active?).to be true
      end
    end

    context 'when group requires approval' do
      before do
        group.update!(approval_required: true)
        notify_service = instance_double(NotifyOccmGroupService, call: nil)
        allow(NotifyOccmGroupService).to receive(:new).and_return(notify_service)
      end

      it 'creates a pending membership' do
        post "/api/v1/occm_groups/#{group.id}/members", headers: new_headers
        expect(response).to have_http_status(200)
        membership = OccmGroupMembership.find_by(occm_group: group, account: new_user.account)
        expect(membership.state_pending?).to be true
      end
    end
  end

  describe 'POST /api/v1/occm_groups/:occm_group_id/members/:id/approve' do
    let(:pending_account) { Fabricate(:account) }
    let!(:pending_membership) { Fabricate(:occm_group_membership, occm_group: group, account: pending_account, role: 'user', state: 'pending') }

    before do
      notify_service = instance_double(NotifyOccmGroupService, call: nil)
      allow(NotifyOccmGroupService).to receive(:new).and_return(notify_service)
    end

    it 'approves membership when user is a moderator' do
      post "/api/v1/occm_groups/#{group.id}/members/#{pending_account.id}/approve", headers: headers
      expect(response).to have_http_status(200)
      expect(pending_membership.reload.state_active?).to be true
    end

    context 'when user is a regular member' do
      let(:regular_user) { Fabricate(:user) }
      let(:regular_token) { Fabricate(:accessible_access_token, resource_owner_id: regular_user.id, scopes: scopes) }
      let(:regular_headers) { { 'Authorization' => "Bearer #{regular_token.token}" } }

      before do
        Fabricate(:occm_group_membership, occm_group: group, account: regular_user.account, role: 'user', state: 'active')
      end

      it 'returns http forbidden' do
        post "/api/v1/occm_groups/#{group.id}/members/#{pending_account.id}/approve", headers: regular_headers
        expect(response).to have_http_status(403)
      end
    end
  end

  describe 'POST /api/v1/occm_groups/:occm_group_id/members/:id/reject' do
    let(:pending_account) { Fabricate(:account) }
    let!(:pending_membership) { Fabricate(:occm_group_membership, occm_group: group, account: pending_account, role: 'user', state: 'pending') }

    before do
      notify_service = instance_double(NotifyOccmGroupService, call: nil)
      allow(NotifyOccmGroupService).to receive(:new).and_return(notify_service)
    end

    it 'rejects membership when user is a moderator' do
      post "/api/v1/occm_groups/#{group.id}/members/#{pending_account.id}/reject", headers: headers
      expect(response).to have_http_status(200)
      expect(pending_membership.reload.state_rejected?).to be true
    end

    context 'when user is a regular member' do
      let(:regular_user) { Fabricate(:user) }
      let(:regular_token) { Fabricate(:accessible_access_token, resource_owner_id: regular_user.id, scopes: scopes) }
      let(:regular_headers) { { 'Authorization' => "Bearer #{regular_token.token}" } }

      before do
        Fabricate(:occm_group_membership, occm_group: group, account: regular_user.account, role: 'user', state: 'active')
      end

      it 'returns http forbidden' do
        post "/api/v1/occm_groups/#{group.id}/members/#{pending_account.id}/reject", headers: regular_headers
        expect(response).to have_http_status(403)
      end
    end
  end

  describe 'DELETE /api/v1/occm_groups/:occm_group_id/members/:id' do
    let(:member_account) { Fabricate(:account) }
    let!(:member_membership) { Fabricate(:occm_group_membership, occm_group: group, account: member_account, role: 'user', state: 'active') }

    before { group.update!(member_count: 2) }

    it 'removes a member' do
      delete "/api/v1/occm_groups/#{group.id}/members/#{member_account.id}", headers: headers
      expect(response).to have_http_status(200)
      expect(OccmGroupMembership.find_by(id: member_membership.id)).to be_nil
    end

    it 'allows self-removal for non-admin' do
      other_user = Fabricate(:user)
      other_token = Fabricate(:accessible_access_token, resource_owner_id: other_user.id, scopes: scopes)
      other_headers = { 'Authorization' => "Bearer #{other_token.token}" }
      Fabricate(:occm_group_membership, occm_group: group, account: other_user.account, role: 'user', state: 'active')
      group.update!(member_count: 3)

      delete "/api/v1/occm_groups/#{group.id}/members/#{other_user.account.id}", headers: other_headers
      expect(response).to have_http_status(200)
    end
  end
end
