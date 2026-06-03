# frozen_string_literal: true

require 'rails_helper'

RSpec.describe RemoveOccmGroupMemberService do
  subject { described_class.new }

  let(:group) { Fabricate(:occm_group, member_count: 3) }
  let(:admin_account) { Fabricate(:account) }
  let(:member_account) { Fabricate(:account) }

  before do
    Fabricate(:occm_group_membership, occm_group: group, account: admin_account, role: 'admin', state: 'active')
    Fabricate(:occm_group_membership, occm_group: group, account: member_account, role: 'user', state: 'active')
  end

  describe '#call' do
    it 'removes the member' do
      subject.call(group, member_account.id, admin_account)
      expect(group.occm_group_memberships.find_by(account: member_account)).to be_nil
    end

    it 'decrements member_count' do
      expect { subject.call(group, member_account.id, admin_account) }.to change { group.reload.member_count }.by(-1)
    end

    it 'raises error when trying to remove an admin' do
      expect { subject.call(group, admin_account.id, admin_account) }.to raise_error(Mastodon::ValidationError)
    end

    it 'allows non-admin to remove themselves' do
      subject.call(group, member_account.id, member_account)
      expect(group.occm_group_memberships.find_by(account: member_account)).to be_nil
    end

    it 'raises error if member is not found' do
      other_account = Fabricate(:account)
      expect { subject.call(group, other_account.id, admin_account) }.to raise_error(ActiveRecord::RecordNotFound)
    end
  end
end
