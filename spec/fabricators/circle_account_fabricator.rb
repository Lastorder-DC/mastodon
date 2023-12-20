# frozen_string_literal: true

Fabricator(:circle_account) do
  circle { Fabricate(:circle) }
  account { Fabricate(:account) }
  before_create { |circle_account, _| circle_account.account.follow!(circle_account.circle.account) }
end
