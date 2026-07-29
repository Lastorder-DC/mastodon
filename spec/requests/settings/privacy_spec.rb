# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Settings Privacy' do
  let(:user) { Fabricate(:user) }
  let(:account) { user.account }

  describe 'PUT /settings/privacy' do
    before { sign_in user }

    it 'gracefully handles invalid nested params' do
      put settings_privacy_path(account: 'invalid')

      expect(response)
        .to have_http_status(400)
    end

    context 'when the account is protected' do
      before do
        account.update!(protected_account: true)
      end

      it 'keeps discovery and both search settings disabled' do
        put settings_privacy_path, params: {
          account: {
            discoverable: '1',
            unlocked: '1',
            indexable: '1',
            settings: { indexable: '1' },
          },
        }

        expect(response).to redirect_to(settings_privacy_path)
        expect(account.reload).to have_attributes(
          locked: true,
          discoverable: false,
          indexable: false
        )
        expect(user.reload.settings['indexable']).to be false
      end
    end
  end
end
