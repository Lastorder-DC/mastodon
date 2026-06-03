# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CreateOccmGroupService do
  subject { described_class.new }

  let(:account) { Fabricate(:account) }

  describe '#call' do
    it 'creates a group with given title' do
      result = subject.call(account, { title: 'Test Group' })
      expect(result).to be_a(OccmGroup)
      expect(result.title).to eq('Test Group')
      expect(result.account).to eq(account)
    end

    it 'creates an admin membership for the owner' do
      result = subject.call(account, { title: 'Test Group' })
      membership = result.occm_group_memberships.find_by(account: account)
      expect(membership).to be_present
      expect(membership.role_admin?).to be true
      expect(membership.state_active?).to be true
    end

    it 'sets member_count to 1 after creation' do
      result = subject.call(account, { title: 'Test Group' })
      expect(result.member_count).to eq(1)
    end

    it 'sets description when provided' do
      result = subject.call(account, { title: 'Test', description: 'A test group' })
      expect(result.description).to eq('A test group')
    end

    it 'defaults approval_required to true' do
      result = subject.call(account, { title: 'Test Group' })
      expect(result.approval_required).to be true
    end

    it 'allows setting approval_required to false' do
      result = subject.call(account, { title: 'Test', approval_required: false })
      expect(result.approval_required).to be false
    end

    it 'raises error when group limit is reached' do
      OccmGroup::GROUP_LIMIT.times { Fabricate(:occm_group, account: account) }
      expect { subject.call(account, { title: 'Over Limit' }) }.to raise_error(ActiveRecord::RecordInvalid)
    end
  end
end
