# frozen_string_literal: true

require 'rails_helper'

RSpec.describe JoinOccmGroupService do
  subject { described_class.new }

  let(:account) { Fabricate(:account) }
  let(:admin_account) { Fabricate(:account) }
  let(:group) { Fabricate(:occm_group, account: admin_account) }

  before do
    Fabricate(:occm_group_membership, occm_group: group, account: admin_account, role: 'admin', state: 'active')
  end

  describe '#call' do
    context 'when group requires approval' do
      before { group.update!(approval_required: true) }

      it 'creates a pending membership' do
        membership = subject.call(account, group)
        expect(membership.state_pending?).to be true
        expect(membership.role_user?).to be true
      end

      it 'does not increment member_count' do
        expect { subject.call(account, group) }.to_not change(group, :member_count)
      end

      it 'notifies admins and moderators' do
        notify_service = instance_double(NotifyOccmGroupService, call: nil)
        allow(NotifyOccmGroupService).to receive(:new).and_return(notify_service)

        subject.call(account, group)

        expect(notify_service).to have_received(:call).with(admin_account, :occm_group_join_request, anything)
      end
    end

    context 'when group does not require approval' do
      before { group.update!(approval_required: false) }

      it 'creates an active membership' do
        membership = subject.call(account, group)
        expect(membership.state_active?).to be true
        expect(membership.role_user?).to be true
      end

      it 'increments member_count' do
        expect { subject.call(account, group) }.to change { group.reload.member_count }.by(1)
      end
    end

    context 'when already a member' do
      before { Fabricate(:occm_group_membership, occm_group: group, account: account, state: 'active') }

      it 'raises a validation error' do
        expect { subject.call(account, group) }.to raise_error(Mastodon::ValidationError)
      end
    end

    context 'when already pending' do
      before { Fabricate(:occm_group_membership, occm_group: group, account: account, state: 'pending') }

      it 'raises a validation error' do
        expect { subject.call(account, group) }.to raise_error(Mastodon::ValidationError)
      end
    end
  end
end
