# frozen_string_literal: true

require 'rails_helper'

describe ProcessReferencesWorker do
  let(:worker) { described_class.new }

  describe 'perform' do
    it 'runs without error for simple call' do
      expect { worker.perform(1000, [], []) }.to_not raise_error
    end

    it 'runs without error with no_fetch_urls' do
      expect { worker.perform(1000, [], [], no_fetch_urls: []) }.to_not raise_error
    end
  end
end
