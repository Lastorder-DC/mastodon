# frozen_string_literal: true

Fabricator(:occm_group_membership) do
  occm_group { Fabricate.build(:occm_group) }
  account { Fabricate.build(:account) }
  role 'user'
  state 'active'
end
