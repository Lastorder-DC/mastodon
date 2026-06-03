# frozen_string_literal: true

class DistributeOccmGroupStatusService < BaseService
  include Redisable

  def call(status, occm_group)
    @status = status
    @group = occm_group

    rendered = InlineRenderer.render(@status, nil, :status)
    payload = Oj.dump(event: :update, payload: rendered)

    redis.publish("timeline:occm_group:#{@group.id}", payload)
  end
end
