# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'OccmGroups Reports' do
  let(:user) { Fabricate(:user) }
  let(:token) { Fabricate(:accessible_access_token, resource_owner_id: user.id, scopes: scopes) }
  let(:scopes) { 'read:occm_groups write:occm_groups' }
  let(:headers) { { 'Authorization' => "Bearer #{token.token}" } }
  let(:account) { user.account }
  let(:group) { Fabricate(:occm_group, account: account) }

  before do
    Fabricate(:occm_group_membership, occm_group: group, account: account, role: 'admin', state: 'active')
  end

  describe 'GET /api/v1/occm_groups/:occm_group_id/reports' do
    let(:target_account) { Fabricate(:account) }
    let!(:report) { Fabricate(:occm_group_report, occm_group: group, account: account, target_account: target_account) }

    context 'when user is a moderator' do
      before do
        get "/api/v1/occm_groups/#{group.id}/reports", headers: headers
      end

      it 'returns http success' do
        expect(response).to have_http_status(200)
      end

      it 'returns reports' do
        expect(response.parsed_body).to be_an(Array)
        expect(response.parsed_body.first[:id]).to eq(report.id.to_s)
      end
    end

    context 'when user is a regular member' do
      let(:regular_user) { Fabricate(:user) }
      let(:regular_token) { Fabricate(:accessible_access_token, resource_owner_id: regular_user.id, scopes: scopes) }
      let(:regular_headers) { { 'Authorization' => "Bearer #{regular_token.token}" } }

      before do
        Fabricate(:occm_group_membership, occm_group: group, account: regular_user.account, role: 'user', state: 'active')
        get "/api/v1/occm_groups/#{group.id}/reports", headers: regular_headers
      end

      it 'returns http forbidden' do
        expect(response).to have_http_status(403)
      end
    end
  end

  describe 'POST /api/v1/occm_groups/:occm_group_id/reports' do
    let(:target_account) { Fabricate(:account) }

    before do
      Fabricate(:occm_group_membership, occm_group: group, account: target_account, role: 'user', state: 'active')
    end

    it 'creates a report' do
      post "/api/v1/occm_groups/#{group.id}/reports", headers: headers, params: {
        target_account_id: target_account.id,
        comment: 'Spam content',
        category: 'spam',
      }
      expect(response).to have_http_status(200)
      expect(response.parsed_body[:category]).to eq('spam')
    end

    context 'when not an active member' do
      let(:non_member_user) { Fabricate(:user) }
      let(:non_member_token) { Fabricate(:accessible_access_token, resource_owner_id: non_member_user.id, scopes: scopes) }
      let(:non_member_headers) { { 'Authorization' => "Bearer #{non_member_token.token}" } }

      it 'returns http not found' do
        post "/api/v1/occm_groups/#{group.id}/reports", headers: non_member_headers, params: {
          target_account_id: target_account.id,
          comment: 'Test',
          category: 'spam',
        }
        expect(response).to have_http_status(404)
      end
    end
  end

  describe 'POST /api/v1/occm_groups/:occm_group_id/reports/:id/resolve' do
    let(:target_account) { Fabricate(:account) }
    let!(:report) { Fabricate(:occm_group_report, occm_group: group, account: account, target_account: target_account) }

    before do
      resolve_service = instance_double(ResolveOccmGroupReportService, call: nil)
      allow(ResolveOccmGroupReportService).to receive(:new).and_return(resolve_service)
    end

    it 'resolves the report when user is a moderator' do
      post "/api/v1/occm_groups/#{group.id}/reports/#{report.id}/resolve", headers: headers, params: { action: 'dismiss' }
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
        post "/api/v1/occm_groups/#{group.id}/reports/#{report.id}/resolve", headers: regular_headers, params: { action: 'dismiss' }
        expect(response).to have_http_status(403)
      end
    end
  end
end
