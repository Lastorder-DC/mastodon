# frozen_string_literal: true

require 'rails_helper'

RSpec.describe TransferOccmGroupAdminService do
  subject { described_class.new }

  let(:admin_account) { Fabricate(:account) }
  let(:target_account) { Fabricate(:account) }
  let(:group) { Fabricate(:occm_group, account: admin_account) }
  let!(:admin_membership) { Fabricate(:occm_group_membership, occm_group: group, account: admin_account, role: 'admin', state: 'active') }
  let!(:target_membership) { Fabricate(:occm_group_membership, occm_group: group, account: target_account, role: 'user', state: 'active') }

  describe '#call' do
    it 'transfers admin role to target account' do
      subject.call(group, target_account.id)
      expect(target_membership.reload.role_admin?).to be true
    end

    it 'demotes former admin to user' do
      subject.call(group, target_account.id)
      expect(admin_membership.reload.role_user?).to be true
    end

    it 'updates group account_id to target' do
      subject.call(group, target_account.id)
      expect(group.reload.account_id).to eq(target_account.id)
    end

    it 'raises error if target is not an active member' do
      non_member = Fabricate(:account)
      expect { subject.call(group, non_member.id) }.to raise_error(ActiveRecord::RecordNotFound)
    end

    it 'raises error if target is pending' do
      pending_account = Fabricate(:account)
      Fabricate(:occm_group_membership, occm_group: group, account: pending_account, state: 'pending')
      expect { subject.call(group, pending_account.id) }.to raise_error(ActiveRecord::RecordNotFound)
    end
  end
end
