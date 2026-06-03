# frozen_string_literal: true

require 'rails_helper'

RSpec.describe OccmGroupReport do
  describe 'enum values' do
    it 'defines category enum' do
      expect(described_class.categories).to eq(
        'other' => 0,
        'spam' => 1,
        'harassment' => 2,
        'off_topic' => 3,
        'rule_violation' => 4
      )
    end
  end

  describe 'validations' do
    it 'enforces max length of 1000 for comment' do
      report = Fabricate.build(:occm_group_report, comment: 'a' * 1001)
      expect(report).to_not be_valid
      expect(report.errors[:comment]).to be_present
    end

    it 'allows comment up to 1000 characters' do
      report = Fabricate.build(:occm_group_report, comment: 'a' * 1000)
      report.valid?
      expect(report.errors[:comment]).to be_empty
    end
  end

  describe 'scopes' do
    let(:group) { Fabricate(:occm_group) }
    let!(:unresolved_report) { Fabricate(:occm_group_report, occm_group: group, action_taken_at: nil) }
    let!(:resolved_report) { Fabricate(:occm_group_report, occm_group: group, action_taken_at: Time.current) }

    describe '.unresolved' do
      it 'returns reports without action_taken_at' do
        expect(described_class.unresolved).to include(unresolved_report)
        expect(described_class.unresolved).to_not include(resolved_report)
      end
    end

    describe '.resolved' do
      it 'returns reports with action_taken_at' do
        expect(described_class.resolved).to include(resolved_report)
        expect(described_class.resolved).to_not include(unresolved_report)
      end
    end
  end

  describe 'associations' do
    it 'belongs to occm_group' do
      expect(described_class.reflect_on_association(:occm_group).macro).to eq(:belongs_to)
    end

    it 'belongs to account' do
      expect(described_class.reflect_on_association(:account).macro).to eq(:belongs_to)
    end

    it 'belongs to target_account' do
      association = described_class.reflect_on_association(:target_account)
      expect(association.macro).to eq(:belongs_to)
      expect(association.options[:class_name]).to eq('Account')
    end
  end
end
