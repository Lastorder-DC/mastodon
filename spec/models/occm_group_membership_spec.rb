# frozen_string_literal: true

require 'rails_helper'

RSpec.describe OccmGroupMembership do
  describe 'enum values' do
    it 'defines role enum with admin, moderator, and user' do
      expect(described_class.roles).to eq('admin' => 0, 'moderator' => 1, 'user' => 2)
    end

    it 'defines state enum with pending, active, and rejected' do
      expect(described_class.states).to eq('pending' => 0, 'active' => 1, 'rejected' => 2)
    end
  end

  describe 'validations' do
    it 'enforces uniqueness of account_id scoped to occm_group_id' do
      group = Fabricate(:occm_group)
      account = Fabricate(:account)
      Fabricate(:occm_group_membership, occm_group: group, account: account)

      duplicate = Fabricate.build(:occm_group_membership, occm_group: group, account: account)
      expect(duplicate).to_not be_valid
      expect(duplicate.errors[:account_id]).to be_present
    end
  end

  describe 'scopes' do
    let(:group) { Fabricate(:occm_group) }
    let!(:active_membership) { Fabricate(:occm_group_membership, occm_group: group, state: 'active') }
    let!(:pending_membership) { Fabricate(:occm_group_membership, occm_group: group, state: 'pending') }
    let!(:admin_membership) { Fabricate(:occm_group_membership, occm_group: group, role: 'admin', state: 'active') }
    let!(:moderator_membership) { Fabricate(:occm_group_membership, occm_group: group, role: 'moderator', state: 'active') }

    describe '.active' do
      it 'returns only active memberships' do
        expect(group.occm_group_memberships.active).to include(active_membership, admin_membership, moderator_membership)
        expect(group.occm_group_memberships.active).to_not include(pending_membership)
      end
    end

    describe '.pending' do
      it 'returns only pending memberships' do
        expect(group.occm_group_memberships.pending).to include(pending_membership)
        expect(group.occm_group_memberships.pending).to_not include(active_membership)
      end
    end

    describe '.admins' do
      it 'returns only admin memberships' do
        expect(group.occm_group_memberships.admins).to include(admin_membership)
        expect(group.occm_group_memberships.admins).to_not include(active_membership, moderator_membership)
      end
    end

    describe '.moderators' do
      it 'returns only moderator memberships' do
        expect(group.occm_group_memberships.moderators).to include(moderator_membership)
        expect(group.occm_group_memberships.moderators).to_not include(active_membership, admin_membership)
      end
    end

    describe '.with_moderation_role' do
      it 'returns admin and moderator memberships' do
        expect(group.occm_group_memberships.with_moderation_role).to include(admin_membership, moderator_membership)
        expect(group.occm_group_memberships.with_moderation_role).to_not include(active_membership, pending_membership)
      end
    end
  end
end
