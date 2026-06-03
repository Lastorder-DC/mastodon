# frozen_string_literal: true

require 'rails_helper'

RSpec.describe OccmGroup do
  describe 'validations' do
    it 'requires title to be present' do
      group = Fabricate.build(:occm_group, title: '')
      expect(group).to_not be_valid
      expect(group.errors[:title]).to include("can't be blank")
    end

    it 'enforces max length of 100 for title' do
      group = Fabricate.build(:occm_group, title: 'a' * 101)
      expect(group).to_not be_valid
      expect(group.errors[:title]).to be_present
    end

    it 'allows title up to 100 characters' do
      group = Fabricate.build(:occm_group, title: 'a' * 100)
      group.valid?
      expect(group.errors[:title]).to be_empty
    end

    it 'enforces max length of 500 for description' do
      group = Fabricate.build(:occm_group, description: 'a' * 501)
      expect(group).to_not be_valid
      expect(group.errors[:description]).to be_present
    end

    it 'allows description up to 500 characters' do
      group = Fabricate.build(:occm_group, description: 'a' * 500)
      group.valid?
      expect(group.errors[:description]).to be_empty
    end

    it 'validates group limit of 50 per account' do
      account = Fabricate(:account)
      OccmGroup::GROUP_LIMIT.times { Fabricate(:occm_group, account: account) }
      group = Fabricate.build(:occm_group, account: account)
      expect(group).to_not be_valid
      expect(group.errors[:base]).to be_present
    end
  end

  describe 'associations' do
    it 'belongs to account' do
      expect(described_class.reflect_on_association(:account).macro).to eq(:belongs_to)
    end

    it 'has many occm_group_memberships' do
      expect(described_class.reflect_on_association(:occm_group_memberships).macro).to eq(:has_many)
    end

    it 'has many members through memberships' do
      association = described_class.reflect_on_association(:members)
      expect(association.macro).to eq(:has_many)
      expect(association.options[:through]).to eq(:occm_group_memberships)
    end

    it 'has many occm_group_statuses' do
      expect(described_class.reflect_on_association(:occm_group_statuses).macro).to eq(:has_many)
    end

    it 'has many occm_group_reports' do
      expect(described_class.reflect_on_association(:occm_group_reports).macro).to eq(:has_many)
    end
  end

  describe 'concerns' do
    it 'includes Paginable' do
      expect(described_class.ancestors).to include(Paginable)
    end
  end
end
