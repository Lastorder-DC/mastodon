# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Profile API' do
  include_context 'with API authentication'

  let(:scopes) { 'write:accounts' }

  let(:account) do
    Fabricate(
      :account,
      avatar: fixture_file_upload('avatar.gif', 'image/gif'),
      header: fixture_file_upload('attachment.jpg', 'image/jpeg')
    )
  end
  let(:user) { account.user }

  describe 'GET /api/v1/profile' do
    let(:scopes) { 'read:accounts' }

    it 'returns HTTP success with the appropriate profile' do
      get '/api/v1/profile', headers: headers

      expect(response)
        .to have_http_status(200)

      expect(response.content_type)
        .to start_with('application/json')

      expect(response.parsed_body)
        .to match(
          'id' => account.id.to_s,
          'avatar' => %r{https://.*},
          'avatar_static' => %r{https://.*},
          'avatar_description' => '',
          'header' => %r{https://.*},
          'header_static' => %r{https://.*},
          'header_description' => '',
          'custom_logo' => nil,
          'custom_logo_static' => nil,
          'custom_logo_description' => '',
          'custom_logo_enabled' => false,
          'background_image' => nil,
          'background_image_static' => nil,
          'background_image_enabled' => false,
          'hide_collections' => anything,
          'bot' => account.bot,
          'locked' => account.locked,
          'discoverable' => account.discoverable,
          'indexable' => account.indexable,
          'display_name' => account.display_name,
          'fields' => [],
          'formatted_fields' => [],
          'attribution_domains' => [],
          'note' => account.note,
          'formatted_note' => account.note,
          'show_featured' => account.show_featured,
          'show_media' => account.show_media,
          'show_media_replies' => account.show_media_replies,
          'protected_account' => anything,
          'featured_tags' => []
        )
    end
  end

  describe 'PATCH /api/v1/profile' do
    subject do
      patch '/api/v1/profile', headers: headers, params: params
    end

    let(:params) do
      {
        avatar: fixture_file_upload('avatar.gif', 'image/gif'),
        avatar_description: 'animated walking round cat',
        discoverable: true,
        display_name: "Alice Isn't Dead",
        header: fixture_file_upload('attachment.jpg', 'image/jpeg'),
        custom_logo: fixture_file_upload('avatar.gif', 'image/gif'),
        custom_logo_description: 'my brand',
        custom_logo_enabled: true,
        background_image: fixture_file_upload('attachment.jpg', 'image/jpeg'),
        background_image_enabled: true,
        indexable: true,
        locked: false,
        note: 'Hello!',
        attribution_domains: ['example.com'],
        fields_attributes: [
          { name: 'pronouns', value: 'she/her' },
          { name: 'foo', value: 'bar' },
        ],
      }
    end

    it_behaves_like 'forbidden for wrong scope', 'read read:accounts'

    describe 'with invalid data' do
      let(:params) { { note: 'a' * 2 * Account::NOTE_LENGTH_LIMIT } }

      it 'returns http unprocessable entity' do
        subject
        expect(response).to have_http_status(422)
        expect(response.content_type)
          .to start_with('application/json')
        expect(response.parsed_body)
          .to include(
            error: /Validation failed/,
            details: include(note: contain_exactly(include(error: 'ERR_TOO_LONG', description: /too long/)))
          )
      end
    end

    describe 'with unsupported MIME type for custom_logo' do
      let(:params) { { custom_logo: fixture_file_upload('text.png', 'text/plain') } }

      it 'returns http unprocessable entity' do
        subject
        expect(response).to have_http_status(422)
        expect(response.content_type)
          .to start_with('application/json')
        expect(response.parsed_body)
          .to include(error: /Validation failed/)
      end
    end

    describe 'with oversize custom_logo_description' do
      let(:params) { { custom_logo_description: 'a' * 151 } }

      it 'returns http unprocessable entity' do
        subject
        expect(response).to have_http_status(422)
        expect(response.content_type)
          .to start_with('application/json')
        expect(response.parsed_body)
          .to include(error: /Validation failed/)
      end
    end

    it 'returns http success with updated JSON attributes' do
      subject

      expect(response)
        .to have_http_status(200)
      expect(response.content_type)
        .to start_with('application/json')
      expect(response.parsed_body)
        .to include({
          locked: false,
        })
      expect(user.account.reload)
        .to have_attributes(
          display_name: eq("Alice Isn't Dead"),
          note: 'Hello!',
          avatar: exist,
          avatar_description: 'animated walking round cat',
          header: exist,
          custom_logo: exist,
          custom_logo_description: 'my brand',
          custom_logo_enabled: true,
          background_image: exist,
          background_image_enabled: true,
          attribution_domains: ['example.com'],
          fields: contain_exactly(
            have_attributes(
              name: 'pronouns',
              value: 'she/her'
            ),
            have_attributes(
              name: 'foo',
              value: 'bar'
            )
          )
        )
      expect(ActivityPub::UpdateDistributionWorker)
        .to have_enqueued_sidekiq_job(user.account_id)
    end
  end

  describe 'DELETE /api/v1/profile/avatar' do
    context 'with wrong scope' do
      before do
        delete '/api/v1/profile/avatar', headers: headers
      end

      it_behaves_like 'forbidden for wrong scope', 'read'
    end

    it 'returns http success and deletes the avatar, preserves the header, queues up distribution' do
      delete '/api/v1/profile/avatar', headers: headers

      expect(response).to have_http_status(200)
      expect(response.content_type)
        .to start_with('application/json')

      account.reload
      expect(account.avatar).to_not exist
      expect(account.header).to exist
      expect(ActivityPub::UpdateDistributionWorker)
        .to have_enqueued_sidekiq_job(account.id)
    end
  end

  describe 'DELETE /api/v1/profile/header' do
    context 'with wrong scope' do
      before do
        delete '/api/v1/profile/header', headers: headers
      end

      it_behaves_like 'forbidden for wrong scope', 'read'
    end

    it 'returns http success, preserves the avatar, deletes the header, queues up distribution' do
      delete '/api/v1/profile/header', headers: headers

      expect(response).to have_http_status(200)
      expect(response.content_type)
        .to start_with('application/json')

      account.reload
      expect(account.avatar).to exist
      expect(account.header).to_not exist
      expect(ActivityPub::UpdateDistributionWorker)
        .to have_enqueued_sidekiq_job(account.id)
    end
  end

  describe 'DELETE /api/v1/profile/custom_logo' do
    let(:account) do
      Fabricate(
        :account,
        avatar: fixture_file_upload('avatar.gif', 'image/gif'),
        header: fixture_file_upload('attachment.jpg', 'image/jpeg'),
        custom_logo: fixture_file_upload('avatar.gif', 'image/gif')
      )
    end

    context 'with wrong scope' do
      before do
        delete '/api/v1/profile/custom_logo', headers: headers
      end

      it_behaves_like 'forbidden for wrong scope', 'read'
    end

    it 'returns http success, deletes the custom_logo, preserves avatar and header, queues up distribution' do
      delete '/api/v1/profile/custom_logo', headers: headers

      expect(response).to have_http_status(200)
      expect(response.content_type)
        .to start_with('application/json')

      account.reload
      expect(account.custom_logo).to_not exist
      expect(account.avatar).to exist
      expect(account.header).to exist
      expect(ActivityPub::UpdateDistributionWorker)
        .to have_enqueued_sidekiq_job(account.id)
    end
  end

  describe 'DELETE /api/v1/profile/background_image' do
    let(:account) do
      Fabricate(
        :account,
        avatar: fixture_file_upload('avatar.gif', 'image/gif'),
        header: fixture_file_upload('attachment.jpg', 'image/jpeg'),
        background_image: fixture_file_upload('attachment.jpg', 'image/jpeg')
      )
    end

    context 'with wrong scope' do
      before do
        delete '/api/v1/profile/background_image', headers: headers
      end

      it_behaves_like 'forbidden for wrong scope', 'read'
    end

    it 'returns http success, deletes the background_image, preserves avatar and header, queues up distribution' do
      delete '/api/v1/profile/background_image', headers: headers

      expect(response).to have_http_status(200)
      expect(response.content_type)
        .to start_with('application/json')

      account.reload
      expect(account.background_image).to_not exist
      expect(account.avatar).to exist
      expect(account.header).to exist
      expect(ActivityPub::UpdateDistributionWorker)
        .to have_enqueued_sidekiq_job(account.id)
    end
  end

  # Feature: custom-logo-and-background, Property 1: Enable-flag round-trip
  # Validates: Requirements 3.1, 3.2, 3.3, 7.1, 7.2, 7.3, 11.2, 11.3
  describe 'Property 1: Enable-flag round-trip' do
    let(:scopes) { 'write:accounts read:accounts' }

    [true, false].product([true, false]).each do |(logo_enabled, bg_enabled)|
      it "round-trips custom_logo_enabled=#{logo_enabled}, background_image_enabled=#{bg_enabled}" do
        patch '/api/v1/profile', headers: headers, params: {
          custom_logo_enabled: logo_enabled,
          background_image_enabled: bg_enabled,
        }

        expect(response).to have_http_status(200)

        get '/api/v1/profile', headers: headers

        expect(response).to have_http_status(200)
        expect(response.parsed_body).to include(
          'custom_logo_enabled' => logo_enabled,
          'background_image_enabled' => bg_enabled
        )
      end
    end
  end

  # Feature: custom-logo-and-background, Property 6: Omitted-field preservation
  # Validates: Requirements 12.4
  describe 'Property 6: Omitted-field preservation' do
    let(:scopes) { 'write:accounts read:accounts' }

    [
      { logo: true, background: true, logo_enabled: true, bg_enabled: true },
      { logo: true, background: false, logo_enabled: false, bg_enabled: true },
      { logo: false, background: true, logo_enabled: true, bg_enabled: false },
      { logo: false, background: false, logo_enabled: false, bg_enabled: false },
    ].each do |state|
      context "with logo=#{state[:logo]}, background=#{state[:background]}, logo_enabled=#{state[:logo_enabled]}, bg_enabled=#{state[:bg_enabled]}" do
        before do
          attrs = { custom_logo_enabled: state[:logo_enabled], background_image_enabled: state[:bg_enabled] }
          attrs[:custom_logo] = fixture_file_upload('avatar.gif', 'image/gif') if state[:logo]
          attrs[:background_image] = fixture_file_upload('attachment.jpg', 'image/jpeg') if state[:background]
          account.update!(attrs)
        end

        it 'preserves stored logo, background, and enable flags when omitted from PATCH' do
          # Capture pre-patch state
          account.reload
          original_logo_file = account.custom_logo_file_name
          original_bg_file = account.background_image_file_name
          original_logo_enabled = account.custom_logo_enabled
          original_bg_enabled = account.background_image_enabled

          # PATCH with only display_name (omitting logo/background fields)
          patch '/api/v1/profile', headers: headers, params: { display_name: 'Preserved' }
          expect(response).to have_http_status(200)

          # GET and verify fields are unchanged
          get '/api/v1/profile', headers: headers
          expect(response).to have_http_status(200)

          body = response.parsed_body
          expect(body['custom_logo_enabled']).to eq(original_logo_enabled)
          expect(body['background_image_enabled']).to eq(original_bg_enabled)

          account.reload
          expect(account.custom_logo_file_name).to eq(original_logo_file)
          expect(account.background_image_file_name).to eq(original_bg_file)
        end
      end
    end
  end

  # Feature: custom-logo-and-background, Property 8: Avatar/header independence
  # Validates: Requirements 13.3
  describe 'Property 8: Avatar/header independence' do
    let(:scopes) { 'write:accounts read:accounts' }

    let(:account) do
      Fabricate(
        :account,
        avatar: fixture_file_upload('avatar.gif', 'image/gif'),
        header: fixture_file_upload('attachment.jpg', 'image/jpeg')
      )
    end

    # Each update operation that should leave avatar/header unchanged
    update_operations = [
      { name: 'uploading custom_logo', params: -> { { custom_logo: fixture_file_upload('avatar.gif', 'image/gif') } } },
      { name: 'uploading background_image', params: -> { { background_image: fixture_file_upload('attachment.jpg', 'image/jpeg') } } },
      { name: 'setting custom_logo_enabled to true', params: -> { { custom_logo_enabled: true } } },
      { name: 'setting custom_logo_enabled to false', params: -> { { custom_logo_enabled: false } } },
      { name: 'setting background_image_enabled to true', params: -> { { background_image_enabled: true } } },
      { name: 'setting background_image_enabled to false', params: -> { { background_image_enabled: false } } },
    ]

    update_operations.each do |operation|
      it "preserves avatar and header when #{operation[:name]}" do
        # Capture avatar/header state before update
        account.reload
        original_avatar_file_name = account.avatar_file_name
        original_header_file_name = account.header_file_name

        get '/api/v1/profile', headers: headers
        expect(response).to have_http_status(200)
        original_avatar_url = response.parsed_body['avatar']
        original_header_url = response.parsed_body['header']

        # Perform the update operation
        patch '/api/v1/profile', headers: headers, params: instance_exec(&operation[:params])
        expect(response).to have_http_status(200)

        # Assert avatar and header file names are unchanged
        account.reload
        expect(account.avatar_file_name).to eq(original_avatar_file_name)
        expect(account.header_file_name).to eq(original_header_file_name)

        # Assert avatar and header URLs are unchanged
        get '/api/v1/profile', headers: headers
        expect(response).to have_http_status(200)
        expect(response.parsed_body['avatar']).to eq(original_avatar_url)
        expect(response.parsed_body['header']).to eq(original_header_url)
      end
    end
  end
end
