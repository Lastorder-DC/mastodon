# frozen_string_literal: true

require 'rails_helper'

describe Api::V1::Timelines::PublicController do
  render_views

  let!(:account) { Fabricate(:account) }
  let!(:user) { Fabricate(:user, account: account) }
  let!(:token) { Fabricate(:accessible_access_token, resource_owner_id: user.id, scopes: 'read') }

  before do
    allow(controller).to receive(:doorkeeper_token) { token }
  end

  describe 'GET #show' do
    subject do
      get :show
      body_as_json
    end

    let!(:local_account)  { Fabricate(:account, domain: nil) }
    let!(:remote_account) { Fabricate(:account, domain: 'test.com') }
    let!(:local_status)   { Fabricate(:status, account: local_account, text: 'ohagi is good') }
    let!(:remote_status)  { Fabricate(:status, account: remote_account, text: 'ohagi is ohagi') }

    it 'load statuses', :aggregate_failures do
      json = subject

      expect(response).to have_http_status(200)
      expect(json).to be_an Array
      expect(json.any? { |status| status[:id] == local_status.id.to_s }).to be true
      expect(json.any? { |status| status[:id] == remote_status.id.to_s }).to be true
    end

    context 'with filter' do
      subject do
        get :show
        body_as_json.filter { |status| status[:filtered].empty? || status[:filtered][0][:filter][:id] != filter.id.to_s }.map { |status| status[:id].to_i }
      end

      before do
        Fabricate(:custom_filter_keyword, custom_filter: filter, keyword: 'ohagi')
        Fabricate(:follow, account: account, target_account: remote_account)
      end

      let(:exclude_follows) { false }
      let(:exclude_localusers) { false }
      let!(:filter) { Fabricate(:custom_filter, account: account, exclude_follows: exclude_follows, exclude_localusers: exclude_localusers) }

      it 'load statuses', :aggregate_failures do
        ids = subject
        expect(ids).to_not include(local_status.id)
        expect(ids).to_not include(remote_status.id)
      end

      context 'when exclude_followers' do
        let(:exclude_follows) { true }

        it 'load statuses', :aggregate_failures do
          ids = subject
          expect(ids).to_not include(local_status.id)
          expect(ids).to include(remote_status.id)
        end
      end

      context 'when exclude_localusers' do
        let(:exclude_localusers) { true }

        it 'load statuses', :aggregate_failures do
          ids = subject
          expect(ids).to include(local_status.id)
          expect(ids).to_not include(remote_status.id)
        end
      end
    end
  end
end
