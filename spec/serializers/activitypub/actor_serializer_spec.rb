# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ActivityPub::ActorSerializer do
  subject { serialized_record_json(record, described_class, adapter: ActivityPub::Adapter) }

  describe '#type' do
    context 'with the instance actor' do
      let(:record) { Account.find(Account::INSTANCE_ACTOR_ID) }

      it { is_expected.to include('type' => 'Application') }
    end

    context 'with an application actor' do
      let(:record) { Fabricate :account, actor_type: 'Application' }

      it { is_expected.to include('type' => 'Service') }
    end

    context 'with a service actor' do
      let(:record) { Fabricate :account, actor_type: 'Service' }

      it { is_expected.to include('type' => 'Service') }
    end

    context 'with a Group actor' do
      let(:record) { Fabricate :account, actor_type: 'Group' }

      it { is_expected.to include('type' => 'Group') }
    end

    context 'with a Person actor' do
      let(:record) { Fabricate :account, actor_type: 'Person' }

      it { is_expected.to include('type' => 'Person') }
    end
  end

  # Feature: custom-logo-and-background — federation-exclusion regression test
  # Validates: Requirement 13.2
  describe 'federation exclusion of custom_logo and background_image' do
    let(:record) { Fabricate(:account) }

    before do
      record.custom_logo = fixture_file_upload('avatar.gif', 'image/gif')
      record.custom_logo_description = 'My logo'
      record.custom_logo_enabled = true
      record.background_image = fixture_file_upload('attachment.jpg', 'image/jpeg')
      record.background_image_enabled = true
      record.save!
    end

    it 'does not include custom_logo keys in the serialized actor' do
      expect(subject.keys).not_to include('custom_logo', 'custom_logo_static', 'custom_logo_description', 'custom_logo_enabled', 'customLogo', 'customLogoStatic', 'customLogoDescription', 'customLogoEnabled')
    end

    it 'does not include background_image keys in the serialized actor' do
      expect(subject.keys).not_to include('background_image', 'background_image_static', 'background_image_enabled', 'backgroundImage', 'backgroundImageStatic', 'backgroundImageEnabled')
    end
  end

  describe '#interactionPolicy' do
    let(:record) { Fabricate(:account) }

    context 'when actor is discoverable' do
      it 'includes an automatic policy allowing everyone' do
        expect(subject).to include('interactionPolicy' => {
          'canFeature' => {
            'automaticApproval' => ['https://www.w3.org/ns/activitystreams#Public'],
          },
        })
      end

      context 'when actor is locked' do
        let(:record) { Fabricate(:account, locked: true) }

        it 'includes an automatic policy allowing followers' do
          expect(subject).to include('interactionPolicy' => {
            'canFeature' => {
              'automaticApproval' => [ActivityPub::TagManager.instance.followers_uri_for(record)],
            },
          })
        end
      end
    end

    context 'when actor is not discoverable' do
      let(:record) { Fabricate(:account, discoverable: false) }

      it 'includes an automatic policy limited to the actor itself' do
        expect(subject).to include('interactionPolicy' => {
          'canFeature' => {
            'automaticApproval' => [ActivityPub::TagManager.instance.uri_for(record)],
          },
        })
      end
    end
  end

  describe 'avatar description' do
    let(:record) { Fabricate(:account, avatar: attachment_fixture('avatar.gif'), avatar_description: 'test') }

    it 'includes an `icon` with the appropraite `summary`' do
      expect(subject).to include('icon' => a_hash_including(
        'summary' => 'test'
      ))
    end
  end
end
