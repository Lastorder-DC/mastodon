# frozen_string_literal: true

Fabricator(:occm_group) do
  account { Fabricate.build(:account) }
  title 'MyGroup'
end
