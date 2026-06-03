# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ApproveOccmGroupMemberService do
  subject { described_class.new }

  let(:group) { Fabricate(:occm_group) }
  let(:account) { Fabricate(:account) }
  let!(:membership) { Fabricate(:occm_group_membership, occm_group: group, account: account, state: 'pending') }

  describe '#call' do
    before do
      notify_service = instance_double(NotifyOccmGroupService, call: nil)
      allow(NotifyOccmGroupService).to receive(:new).and_return(notify_service)
    end

    it 'changes state from pending to active' do
      subject.call(group, account.id)
      expect(membership.reload.state_active?).to be true
    end

    it 'increments member_count' do
      expect { subject.call(group, account.id) }.to change { group.reload.member_count }.by(1)
    end

    it 'sends notification to the approved member' do
      notify_service = instance_double(NotifyOccmGroupService, call: nil)
      allow(NotifyOccmGroupService).to receive(:new).and_return(notify_service)

      subject.call(group, account.id)

      expect(notify_service).to have_received(:call).with(account, :occm_group_join_approved, membership)
    end

    it 'raises error if membership is not pending' do
      membership.update!(state: :active)
      expect { subject.call(group, account.id) }.to raise_error(ActiveRecord::RecordNotFound)
    end
  end
end
