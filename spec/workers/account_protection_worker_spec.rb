# frozen_string_literal: true

require 'rails_helper'

RSpec.describe AccountProtectionWorker do
  subject(:perform_worker) { described_class.new.perform(account.id) }

  let(:user) { Fabricate(:user) }
  let(:account) { user.account }
  let(:remote_followee) { Fabricate(:account, domain: 'followee.example', uri: 'https://followee.example/users/a') }
  let(:remote_follower) { Fabricate(:account, domain: 'follower.example', uri: 'https://follower.example/users/b') }
  let(:remote_requester) { Fabricate(:account, domain: 'requester.example', uri: 'https://requester.example/users/c') }
  let(:booster) { Fabricate(:user).account }
  let(:non_follower) { Fabricate(:user).account }

  let!(:public_status) { Fabricate(:status, account: account, visibility: :public) }
  let!(:unlisted_status) { Fabricate(:status, account: account, visibility: :unlisted) }
  let!(:private_status) { Fabricate(:status, account: account, visibility: :private) }
  let!(:direct_status) { Fabricate(:status, account: account, visibility: :direct) }
  let!(:reblog) { Fabricate(:status, account: booster, reblog: public_status) }
  let!(:outgoing_follow) { Fabricate(:follow, account: account, target_account: remote_followee) }
  let!(:incoming_follow) { Fabricate(:follow, account: remote_follower, target_account: account) }
  let!(:incoming_request) { Fabricate(:follow_request, account: remote_requester, target_account: account) }
  let!(:mention_notification) do
    mention = Fabricate(:mention, status: public_status, account: non_follower)
    Fabricate(:notification, type: :mention, activity: mention, from_account: account, account: non_follower)
  end

  before do
    user.settings['default_privacy'] = 'public'
    user.settings['indexable'] = true
    user.save!

    account.update_columns(
      protected_account: true,
      locked: false,
      discoverable: true,
      indexable: true
    )
  end

  it 'enforces privacy settings for accounts protected before deployment' do
    perform_worker

    expect(account.reload).to have_attributes(
      locked: true,
      discoverable: false,
      indexable: false
    )
    expect(user.reload.setting_default_privacy).to eq('private')
    expect(user.settings['indexable']).to be false
  end

  it 'makes existing public statuses followers-only and keeps narrower visibilities' do
    perform_worker

    expect(public_status.reload).to have_attributes(
      visibility: 'private',
      visibility_before_protection: Status.visibilities.fetch('public')
    )
    expect(unlisted_status.reload).to have_attributes(
      visibility: 'private',
      visibility_before_protection: Status.visibilities.fetch('unlisted')
    )
    expect(private_status.reload).to have_attributes(visibility: 'private', visibility_before_protection: nil)
    expect(direct_status.reload).to have_attributes(visibility: 'direct', visibility_before_protection: nil)
  end

  it 'restores each status to its original visibility when protection is disabled' do
    perform_worker
    account.update_columns(protected_account: false)

    described_class.new.perform(account.id)

    expect(public_status.reload).to have_attributes(
      visibility: 'public',
      visibility_before_protection: nil
    )
    expect(unlisted_status.reload).to have_attributes(
      visibility: 'unlisted',
      visibility_before_protection: nil
    )
    expect(private_status.reload).to have_attributes(visibility: 'private', visibility_before_protection: nil)
    expect(direct_status.reload).to have_attributes(visibility: 'direct', visibility_before_protection: nil)
  end

  it 'removes local boost copies without federating an undo' do
    perform_worker

    expect(Status.unscoped.exists?(reblog.id)).to be false
    expect(ActivityPub::DeliveryWorker).to_not have_enqueued_sidekiq_job
  end

  it 'severs existing remote relationships and pending requests locally' do
    perform_worker

    expect(Follow.exists?(outgoing_follow.id)).to be false
    expect(Follow.exists?(incoming_follow.id)).to be false
    expect(FollowRequest.exists?(incoming_request.id)).to be false
    expect(ActivityPub::DeliveryWorker).to_not have_enqueued_sidekiq_job
  end

  it 'removes old mention notifications sent to local non-followers' do
    perform_worker

    expect(Notification.exists?(mention_notification.id)).to be false
  end

  it 'stops if protection was disabled before the worker runs' do
    account.update_columns(protected_account: false)

    perform_worker

    expect(public_status.reload.visibility).to eq('public')
  end
end
