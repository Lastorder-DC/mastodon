# frozen_string_literal: true

Fabricator(:occm_group_status) do
  occm_group { Fabricate.build(:occm_group) }
  status { Fabricate.build(:status) }
  account { Fabricate.build(:account) }
end
