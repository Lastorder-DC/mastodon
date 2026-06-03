# frozen_string_literal: true

require 'rails_helper'

RSpec.describe RejectOccmGroupMemberService do
  subject { described_class.new }

  let(:group) { Fabricate(:occm_group) }
  let(:account) { Fabricate(:account) }
  let!(:membership) { Fabricate(:occm_group_membership, occm_group: group, account: account, state: 'pending') }

  describe '#call' do
    before do
      notify_service = instance_double(NotifyOccmGroupService, call: nil)
      allow(NotifyOccmGroupService).to receive(:new).and_return(notify_service)
    end

    it 'changes state to rejected' do
      subject.call(group, account.id)
      expect(membership.reload.state_rejected?).to be true
    end

    it 'sends notification to the rejected member' do
      notify_service = instance_double(NotifyOccmGroupService, call: nil)
      allow(NotifyOccmGroupService).to receive(:new).and_return(notify_service)

      subject.call(group, account.id)

      expect(notify_service).to have_received(:call).with(account, :occm_group_join_rejected, membership)
    end

    it 'raises error if membership is not pending' do
      membership.update!(state: :active)
      expect { subject.call(group, account.id) }.to raise_error(ActiveRecord::RecordNotFound)
    end
  end
end
