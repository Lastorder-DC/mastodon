# frozen_string_literal: true

Fabricator(:occm_group_report) do
  occm_group { Fabricate.build(:occm_group) }
  account { Fabricate.build(:account) }
  target_account { Fabricate.build(:account) }
  category 'other'
end
