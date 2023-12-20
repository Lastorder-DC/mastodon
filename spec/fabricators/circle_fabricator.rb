# frozen_string_literal: true

Fabricator(:circle) do
  account { Fabricate.build(:account) }
  title 'MyString'
end
