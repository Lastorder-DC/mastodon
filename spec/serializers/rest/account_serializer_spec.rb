# frozen_string_literal: true

require 'rails_helper'

RSpec.describe REST::AccountSerializer do
  subject do
    serialized_record_json(account, described_class, options: {
      scope: current_user,
      scope_name: :current_user,
    })
  end

  let(:default_datetime) { DateTime.new(2024, 11, 28, 16, 20, 0) }
  let(:role)    { Fabricate(:user_role, name: 'Role', highlighted: true) }
  let(:user)    { Fabricate(:user, role: role) }
  let(:account) { user.account }
  let(:current_user) { Fabricate(:user) }

  context 'when the account is protected' do
    before do
      account.update!(protected_account: true)
    end

    it 'exposes the protection flag for display-name lock icons' do
      expect(subject['protected_account']).to be true
    end
  end

  context 'when the account is suspended' do
    before do
      account.suspend!
    end

    it 'returns empty roles' do
      expect(subject['roles']).to eq []
    end
  end

  context 'when the account has a highlighted role' do
    let(:role) { Fabricate(:user_role, name: 'Role', highlighted: true) }

    it 'returns the expected role' do
      expect(subject['roles'].first).to include({ 'name' => 'Role' })
    end
  end

  context 'when the account has a non-highlighted role' do
    let(:role) { Fabricate(:user_role, name: 'Role', highlighted: false) }

    it 'returns empty roles' do
      expect(subject['roles']).to eq []
    end
  end

  context 'when the account is memorialized' do
    before do
      account.memorialize!
    end

    it 'marks it as such' do
      expect(subject['memorial']).to be true
    end
  end

  context 'when created_at is populated' do
    before do
      account.account_stat.update!(created_at: default_datetime)
    end

    it 'parses as RFC 3339 datetime' do
      expect(subject)
        .to include(
          'created_at' => match_api_datetime_format
        )
    end
  end

  context 'when last_status_at is populated' do
    before do
      account.account_stat.update!(last_status_at: default_datetime)
    end

    it 'is serialized as yyyy-mm-dd' do
      expect(subject['last_status_at']).to eq('2024-11-28')
    end
  end

  # Tasks 4.5/4.6: Custom logo and background image privacy scoping
  describe 'custom logo and background image fields' do
    let(:account) { Fabricate(:account) }

    before do
      account.custom_logo = fixture_file_upload('avatar.gif', 'image/gif')
      account.custom_logo_description = 'My logo'
      account.custom_logo_enabled = true
      account.background_image = fixture_file_upload('attachment.jpg', 'image/jpeg')
      account.background_image_enabled = true
      account.save!
    end

    context 'when the serialized account is the current user' do
      let(:current_user) { account.user }

      it 'includes the custom logo and background image fields' do
        expect(subject).to include(
          'custom_logo', 'custom_logo_static', 'custom_logo_description',
          'custom_logo_enabled', 'background_image', 'background_image_static',
          'background_image_enabled'
        )
        expect(subject['custom_logo']).to match(%r{https?://})
        expect(subject['custom_logo_description']).to eq('My logo')
        expect(subject['custom_logo_enabled']).to be true
        expect(subject['background_image']).to match(%r{https?://})
        expect(subject['background_image_enabled']).to be true
      end
    end

    context 'when the serialized account is NOT the current user' do
      let(:current_user) { Fabricate(:user) }

      it 'does not include the custom logo and background image fields' do
        expect(subject).not_to include(
          'custom_logo', 'custom_logo_static', 'custom_logo_description',
          'custom_logo_enabled', 'background_image', 'background_image_static',
          'background_image_enabled'
        )
      end
    end

    # Feature: custom-logo-and-background, Property 5: Current-user privacy scoping
    # Validates: Requirements 11.5, 13.1
    describe 'Property 5: Current-user privacy scoping' do
      [true, false].product([true, false]).each do |is_owner, has_images|
        context "when is_owner=#{is_owner}, has_images=#{has_images}" do
          let(:current_user) { is_owner ? account.user : Fabricate(:user) }

          before do
            unless has_images
              account.custom_logo = nil
              account.background_image = nil
              account.save!
            end
          end

          it "includes custom logo/background fields iff owned (is_owner=#{is_owner})" do
            scoped_keys = %w[custom_logo custom_logo_static custom_logo_description custom_logo_enabled background_image background_image_static background_image_enabled]

            if is_owner
              scoped_keys.each do |key|
                expect(subject).to have_key(key)
              end
            else
              scoped_keys.each do |key|
                expect(subject).not_to have_key(key)
              end
            end
          end
        end
      end
    end
  end

  describe '#feature_approval' do
    context 'when account is local' do
      context 'when account is discoverable' do
        it 'includes a policy that allows featuring' do
          expect(subject['feature_approval']).to include({
            'automatic' => ['public'],
            'manual' => [],
            'current_user' => 'automatic',
          })
        end

        context 'when account is locked' do
          let(:account) { Fabricate(:account, locked: true) }

          context 'when the current account does not follow the user' do
            it 'includes a policy that allows featuring for followers and has "denied" for the current user' do
              expect(subject['feature_approval']).to include({
                'automatic' => ['followers'],
                'manual' => [],
                'current_user' => 'denied',
              })
            end
          end

          context 'when the current account follows the user' do
            before { current_user.account.follow!(account) }

            it 'includes a policy that allows featuring for followers and has "automatic" for the current user' do
              expect(subject['feature_approval']).to include({
                'automatic' => ['followers'],
                'manual' => [],
                'current_user' => 'automatic',
              })
            end
          end
        end
      end

      context 'when account is not discoverable' do
        let(:account) { Fabricate(:account, discoverable: false) }

        it 'includes a policy that disallows featuring' do
          expect(subject['feature_approval']).to include({
            'automatic' => [],
            'manual' => [],
            'current_user' => 'denied',
          })
        end
      end
    end

    context 'when account is remote' do
      let(:account) { Fabricate(:account, domain: 'example.com', feature_approval_policy: 0b11000000000000000010) }

      it 'includes the matching policy' do
        expect(subject['feature_approval']).to include({
          'automatic' => ['followers', 'following'],
          'manual' => ['public'],
          'current_user' => 'manual',
        })
      end
    end
  end
end
