# frozen_string_literal: true

require 'rails_helper'

RSpec.describe UpdateAccountService do
  subject { described_class.new }

  describe 'switching form locked to unlocked accounts', :inline_jobs do
    let(:account) { Fabricate(:account, locked: true) }
    let(:alice)   { Fabricate(:account) }
    let(:bob)     { Fabricate(:account) }
    let(:eve)     { Fabricate(:account) }

    before do
      bob.touch(:silenced_at)
      account.mute!(eve)

      FollowService.new.call(alice, account)
      FollowService.new.call(bob, account)
      FollowService.new.call(eve, account)
    end

    it 'auto accepts pending follow requests from appropriate accounts' do
      subject.call(account, { locked: false })

      expect(alice).to be_following(account)
      expect(alice).to_not be_requested(account)

      expect(bob).to_not be_following(account)
      expect(bob).to be_requested(account)

      expect(eve).to be_following(account)
      expect(eve).to_not be_requested(account)
    end
  end

  describe 'adding domains to attribution_domains' do
    let(:account) { Fabricate(:account) }
    let!(:preview_card) { Fabricate(:preview_card, url: 'https://writer.example.com/article', unverified_author_account: account, author_account: nil) }
    let!(:unattributable_preview_card) { Fabricate(:preview_card, url: 'https://otherwriter.example.com/article', unverified_author_account: account, author_account: nil) }
    let!(:unrelated_preview_card) { Fabricate(:preview_card) }

    it 'reattributes expected preview cards' do
      expect { subject.call(account, { attribution_domains: ['writer.example.com'] }) }
        .to change { preview_card.reload.author_account }.from(nil).to(account)
        .and not_change { unattributable_preview_card.reload.author_account }
        .and(not_change { unrelated_preview_card.reload.author_account })
    end
  end

  describe 'enabling account protection' do
    let(:user) { Fabricate(:user) }
    let(:account) { user.account }

    before do
      account.update!(discoverable: true, indexable: true, locked: false)
      user.settings['default_privacy'] = 'public'
      user.settings['indexable'] = true
      user.save!
    end

    it 'forces privacy settings and schedules existing-status cleanup' do
      subject.call(account, { protected_account: true, discoverable: true, indexable: true, locked: false })

      expect(account.reload).to have_attributes(
        protected_account: true,
        locked: true,
        discoverable: false,
        indexable: false
      )
      expect(user.reload.setting_default_privacy).to eq('private')
      expect(user.settings['indexable']).to be false
      expect(AccountProtectionWorker).to have_enqueued_sidekiq_job(account.id)
    end

    it 'does not allow privacy fields to be enabled while protection remains active' do
      subject.call(account, { protected_account: true })
      subject.call(account, { discoverable: true, indexable: true, locked: false })

      expect(account.reload).to have_attributes(locked: true, discoverable: false, indexable: false)
    end

    it 'schedules visibility restoration when protection is disabled' do
      subject.call(account, { protected_account: true })
      AccountProtectionWorker.jobs.clear

      subject.call(account, { protected_account: false })

      expect(account.reload.protected_account).to be false
      expect(AccountProtectionWorker).to have_enqueued_sidekiq_job(account.id)
    end
  end
end
