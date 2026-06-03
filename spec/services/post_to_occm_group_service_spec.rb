# frozen_string_literal: true

require 'rails_helper'

RSpec.describe PostToOccmGroupService do
  subject { described_class.new }

  let(:account) { Fabricate(:account) }
  let(:group) { Fabricate(:occm_group) }
  let(:status) { Fabricate(:status, account: account) }

  describe '#call' do
    before do
      Fabricate(:occm_group_membership, occm_group: group, account: account, state: 'active')
      post_service = instance_double(PostStatusService, call: status)
      allow(PostStatusService).to receive(:new).and_return(post_service)
      distribute_service = instance_double(DistributeOccmGroupStatusService, call: nil)
      allow(DistributeOccmGroupStatusService).to receive(:new).and_return(distribute_service)
    end

    it 'creates a status through PostStatusService' do
      post_service = instance_double(PostStatusService, call: status)
      allow(PostStatusService).to receive(:new).and_return(post_service)

      subject.call(account, group, { status: 'Hello group!' })

      expect(post_service).to have_received(:call).with(
        account,
        text: 'Hello group!',
        visibility: :limited,
        local_only: true,
        media_ids: nil
      )
    end

    it 'creates an OccmGroupStatus record' do
      expect { subject.call(account, group, { status: 'Hello group!' }) }
        .to change(group.occm_group_statuses, :count).by(1)
    end

    it 'calls DistributeOccmGroupStatusService' do
      distribute_service = instance_double(DistributeOccmGroupStatusService, call: nil)
      allow(DistributeOccmGroupStatusService).to receive(:new).and_return(distribute_service)

      subject.call(account, group, { status: 'Hello group!' })

      expect(distribute_service).to have_received(:call).with(status, group)
    end

    context 'when account is not an active member' do
      let(:non_member) { Fabricate(:account) }

      it 'raises NotPermittedError' do
        expect { subject.call(non_member, group, { status: 'Hello' }) }.to raise_error(Mastodon::NotPermittedError)
      end
    end
  end
end
