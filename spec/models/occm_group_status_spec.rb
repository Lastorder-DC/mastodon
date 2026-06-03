# frozen_string_literal: true

require 'rails_helper'

RSpec.describe OccmGroupStatus do
  describe 'associations' do
    it 'belongs to occm_group' do
      expect(described_class.reflect_on_association(:occm_group).macro).to eq(:belongs_to)
    end

    it 'belongs to status' do
      expect(described_class.reflect_on_association(:status).macro).to eq(:belongs_to)
    end

    it 'belongs to account' do
      expect(described_class.reflect_on_association(:account).macro).to eq(:belongs_to)
    end
  end

  describe 'validations' do
    it 'enforces uniqueness of status_id scoped to occm_group_id' do
      group = Fabricate(:occm_group)
      status = Fabricate(:status)
      account = Fabricate(:account)
      Fabricate(:occm_group_status, occm_group: group, status: status, account: account)

      duplicate = Fabricate.build(:occm_group_status, occm_group: group, status: status, account: account)
      expect(duplicate).to_not be_valid
      expect(duplicate.errors[:status_id]).to be_present
    end

    it 'allows same status in different groups' do
      status = Fabricate(:status)
      account = Fabricate(:account)
      group1 = Fabricate(:occm_group)
      group2 = Fabricate(:occm_group)
      Fabricate(:occm_group_status, occm_group: group1, status: status, account: account)

      other = Fabricate.build(:occm_group_status, occm_group: group2, status: status, account: account)
      expect(other).to be_valid
    end
  end

  describe 'concerns' do
    it 'includes Paginable' do
      expect(described_class.ancestors).to include(Paginable)
    end
  end
end
