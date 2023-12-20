# frozen_string_literal: true

Fabricator(:circle_status) do
  circle
  status
  before_create { |circle_status, _| circle_status.status.account = circle.account }
end
