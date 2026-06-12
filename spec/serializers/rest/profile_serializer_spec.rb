# frozen_string_literal: true

require 'rails_helper'

RSpec.describe REST::ProfileSerializer do
  subject { serialized_record_json(account, described_class) }

  let(:account) { Fabricate(:account) }

  context 'when the account has no custom logo or background image' do
    it 'includes the new attributes with nil/default values' do
      expect(subject).to include(
        'custom_logo' => nil,
        'custom_logo_static' => nil,
        'custom_logo_description' => '',
        'custom_logo_enabled' => false,
        'background_image' => nil,
        'background_image_static' => nil,
        'background_image_enabled' => false
      )
    end
  end

  context 'when the account has a custom logo stored' do
    before do
      account.custom_logo = fixture_file_upload('avatar.gif', 'image/gif')
      account.custom_logo_description = 'My brand logo'
      account.custom_logo_enabled = true
      account.save!
    end

    it 'returns full asset URLs for custom_logo and custom_logo_static' do
      expect(subject['custom_logo']).to be_a(String)
      expect(subject['custom_logo']).to match(%r{https?://})
      expect(subject['custom_logo_static']).to be_a(String)
      expect(subject['custom_logo_static']).to match(%r{https?://})
    end

    it 'returns the stored description and enabled flag' do
      expect(subject['custom_logo_description']).to eq('My brand logo')
      expect(subject['custom_logo_enabled']).to be true
    end
  end

  context 'when the account has a background image stored' do
    before do
      account.background_image = fixture_file_upload('attachment.jpg', 'image/jpeg')
      account.background_image_enabled = true
      account.save!
    end

    it 'returns full asset URLs for background_image and background_image_static' do
      expect(subject['background_image']).to be_a(String)
      expect(subject['background_image']).to match(%r{https?://})
      expect(subject['background_image_static']).to be_a(String)
      expect(subject['background_image_static']).to match(%r{https?://})
    end

    it 'returns the stored enabled flag' do
      expect(subject['background_image_enabled']).to be true
    end
  end

  # Feature: custom-logo-and-background, Property 7: Stored-attachment URL presence
  # Validates: Requirements 1.1, 5.1, 11.1
  describe 'Property 7: Stored-attachment URL presence' do
    [true, false].product([true, false]).each do |logo_stored, background_stored|
      context "when custom_logo stored=#{logo_stored}, background_image stored=#{background_stored}" do
        before do
          if logo_stored
            account.custom_logo = fixture_file_upload('avatar.gif', 'image/gif')
            account.save!
          end
          if background_stored
            account.background_image = fixture_file_upload('attachment.jpg', 'image/jpeg')
            account.save!
          end
        end

        it "returns custom_logo URL iff logo is stored (stored=#{logo_stored})" do
          if logo_stored
            expect(subject['custom_logo']).to be_a(String)
            expect(subject['custom_logo']).to match(%r{https?://})
            expect(subject['custom_logo_static']).to be_a(String)
            expect(subject['custom_logo_static']).to match(%r{https?://})
          else
            expect(subject['custom_logo']).to be_nil
            expect(subject['custom_logo_static']).to be_nil
          end
        end

        it "returns background_image URL iff background is stored (stored=#{background_stored})" do
          if background_stored
            expect(subject['background_image']).to be_a(String)
            expect(subject['background_image']).to match(%r{https?://})
            expect(subject['background_image_static']).to be_a(String)
            expect(subject['background_image_static']).to match(%r{https?://})
          else
            expect(subject['background_image']).to be_nil
            expect(subject['background_image_static']).to be_nil
          end
        end
      end
    end
  end
end
