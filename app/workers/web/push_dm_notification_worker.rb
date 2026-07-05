# frozen_string_literal: true

class Web::PushDmNotificationWorker
  include Sidekiq::Worker
  include RoutingHelper

  sidekiq_options queue: 'push', retry: 5

  TTL     = 48.hours
  URGENCY = 'normal'

  def perform(subscription_id, dm_message_id)
    @subscription = Web::PushSubscription.find(subscription_id)
    @message = DmMessage.includes(:account, :dm_chat_room).find(dm_message_id)

    return if @message.updated_at < TTL.ago

    # Clean up old Web::PushSubscriptions that were added before validation of
    # the endpoint and keys: #30542, #30540
    unless @subscription.valid?
      Rails.logger.debug { "Web::PushSubscription is invalid, removing: #{subscription_id}" }
      @subscription.destroy!

      return
    end

    if web_push_request.legacy
      perform_legacy_request
    else
      perform_standard_request
    end
  rescue ActiveRecord::RecordNotFound
    true
  end

  private

  def perform_legacy_request
    payload = web_push_request.legacy_encrypt(push_notification_json)

    request_pool.with(web_push_request.audience) do |http_client|
      request = Request.new(:post, web_push_request.endpoint, body: payload.fetch(:ciphertext), http_client: http_client)

      request.add_headers(
        'Content-Type' => 'application/octet-stream',
        'Ttl' => TTL.to_s,
        'Urgency' => URGENCY,
        'Content-Encoding' => 'aesgcm',
        'Encryption' => "salt=#{Webpush.encode64(payload.fetch(:salt)).delete('=')}",
        'Crypto-Key' => "dh=#{Webpush.encode64(payload.fetch(:server_public_key)).delete('=')};#{web_push_request.crypto_key_header}",
        'Authorization' => web_push_request.legacy_authorization_header,
        'Unsubscribe-URL' => subscription_url
      )

      send(request)
    end
  end

  def perform_standard_request
    payload = web_push_request.standard_encrypt(push_notification_json)

    request_pool.with(web_push_request.audience) do |http_client|
      request = Request.new(:post, web_push_request.endpoint, body: payload, http_client: http_client)

      request.add_headers(
        'Content-Type' => 'application/octet-stream',
        'Ttl' => TTL.to_s,
        'Urgency' => URGENCY,
        'Content-Encoding' => 'aes128gcm',
        'Authorization' => web_push_request.standard_authorization_header,
        'Unsubscribe-URL' => subscription_url,
        'Content-Length' => payload.length.to_s
      )

      send(request)
    end
  end

  def send(request)
    request.perform do |response|
      # If the server responds with an error in the 4xx range
      # that isn't about rate-limiting or timeouts, we can
      # assume that the subscription is invalid or expired
      # and must be removed

      if (400..499).cover?(response.code) && ![408, 429].include?(response.code)
        @subscription.destroy!
      elsif !(200...300).cover?(response.code)
        raise Mastodon::UnexpectedResponseError, response
      end
    end
  end

  def web_push_request
    @web_push_request ||= WebPushRequest.new(@subscription)
  end

  def push_notification_json
    I18n.with_locale(@subscription.locale.presence || I18n.default_locale) do
      {
        # Native apps validate this against Mastodon's fixed notification type enum and
        # silently drop anything else, so a custom 'dm' value can't go here; 'mention' is
        # the closest fit and unknown apps just ignore the extra `is_dm` marker below.
        notification_type: 'mention',
        is_dm: true,
        # Top-level so native clients (which only know PushNotification's flat field set) can
        # read it directly; the web service worker builds its own /direct_message/:uuid path from it.
        dm_room_uuid: @message.dm_chat_room.uuid,
        access_token: @subscription.associated_access_token,
        preferred_locale: I18n.locale.to_s,
        title: @message.account.display_name.presence || @message.account.username,
        body: @message.content_plain.to_s.truncate(140),
        icon: @message.account.avatar.url(:original),
        tag: "dm-#{@message.dm_chat_room.uuid}",
      }.to_json
    end
  end

  def request_pool
    RequestPool.current
  end

  def subscription_url
    api_web_push_subscription_url(id: @subscription.generate_token_for(:unsubscribe))
  end
end
