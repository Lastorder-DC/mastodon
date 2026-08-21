# frozen_string_literal: true

require 'rails_helper'

RSpec.describe RateLimiter do
  describe '#to_headers' do
    let(:normal_role) { Fabricate(:user_role, api_rate_limit_boost: false) }
    let(:boosted_role) { Fabricate(:user_role, api_rate_limit_boost: true) }
    let(:normal_account) { Fabricate(:user, role: normal_role).account }
    let(:boosted_account) { Fabricate(:user, role: boosted_role).account }

    it 'dynamically multiplies every current family limit for a boosted role' do
      normal_limits = described_class::FAMILIES.keys.index_with do |family|
        described_class.new(normal_account, family: family).to_headers.fetch('X-RateLimit-Limit').to_i
      end
      boosted_limits = described_class::FAMILIES.keys.index_with do |family|
        described_class.new(boosted_account, family: family).to_headers.fetch('X-RateLimit-Limit').to_i
      end

      expect(boosted_limits).to eq(normal_limits.transform_values { |limit| limit * UserRole::API_RATE_LIMIT_MULTIPLIER })
    end
  end
end
