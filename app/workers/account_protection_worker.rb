# frozen_string_literal: true

class AccountProtectionWorker
  include Sidekiq::Worker
  include Redisable

  sidekiq_options queue: 'pull'

  def perform(account_id)
    @account = Account.local.find(account_id)
    if @account.protected_account?
      enforce_privacy_settings!
      sever_remote_relationships!
      privatize_statuses!
      remove_inaccessible_notifications!
    else
      restore_statuses!
    end
  rescue ActiveRecord::RecordNotFound
    true
  end

  private

  def enforce_privacy_settings!
    @account.save!
    @account.user&.save!
  end

  def sever_remote_relationships!
    remote_account_ids = Account.remote.select(:id)

    Follow.where(account: @account, target_account_id: remote_account_ids).includes(:target_account).find_each do |follow|
      UnfollowService.new.call(@account, follow.target_account, skip_federation: true)
    end

    Follow.where(account_id: remote_account_ids, target_account: @account).includes(:account).find_each do |follow|
      UnfollowService.new.call(follow.account, @account, skip_federation: true, skip_unmerge: true)
    end

    FollowRequest
      .where(account: @account, target_account_id: remote_account_ids)
      .or(FollowRequest.where(account_id: remote_account_ids, target_account: @account))
      .in_batches
      .destroy_all
  end

  def privatize_statuses!
    @account.statuses.where(visibility: %i(public unlisted)).includes(:tags, :media_attachments).reorder(nil).find_in_batches do |statuses|
      break unless @account.reload.protected_account?

      remove_reblogs!(statuses)
      remember_and_privatize_statuses!(statuses)
      clear_status_caches!(statuses)

      statuses.each do |status|
        remove_from_non_follower_tag_feeds!(status)
        broadcast_public_removal!(status) if status.public_visibility?
      end
    end
  end

  def remember_and_privatize_statuses!(statuses)
    statuses.group_by(&:visibility).each do |visibility, visibility_statuses|
      visibility_value = Status.visibilities.fetch(visibility)
      scope = Status.where(id: visibility_statuses.map(&:id))

      scope.where(visibility_before_protection: nil).update_all(visibility_before_protection: visibility_value)
      scope.update_all(visibility: Status.visibilities.fetch('private'))
    end
  end

  def restore_statuses!
    restorable_visibilities = Status.visibilities.values_at('public', 'unlisted')

    @account.statuses
      .where(visibility_before_protection: restorable_visibilities)
      .reorder(nil)
      .find_in_batches do |statuses|
        break if @account.reload.protected_account?

        statuses.group_by(&:visibility_before_protection).each do |visibility, visibility_statuses|
          Status.where(id: visibility_statuses.map(&:id)).update_all(
            visibility: visibility,
            visibility_before_protection: nil
          )
        end

        clear_status_caches!(statuses)
      end
  end

  def remove_reblogs!(statuses)
    Status.unscoped.where(reblog_of_id: statuses.map(&:id), deleted_at: nil).includes(:account).find_each do |reblog|
      # This only removes our local copy. `original_removed` deliberately
      # prevents an Undo from being federated on behalf of the booster.
      RemoveStatusService.new.call(reblog, original_removed: true)
    end
  end

  def clear_status_caches!(statuses)
    Rails.cache.delete_multi(
      statuses.flat_map do |status|
        [
          "v3:statuses/#{status.id}",
          "statuses/show:v3:statuses/#{status.id}",
        ]
      end
    )
  end

  def remove_from_non_follower_tag_feeds!(status)
    tag_ids = status.tags.map(&:id)
    return if tag_ids.empty?

    recipient_ids = TagFollow
      .where(tag_id: tag_ids)
      .where.not(account_id: @account.followers.select(:id))
      .distinct
      .pluck(:account_id)

    Account.local.where(id: recipient_ids).includes(:user).find_each do |recipient|
      FeedManager.instance.unpush_from_home(recipient, status)
    end
  end

  def broadcast_public_removal!(status)
    payload = { event: :delete, payload: status.id.to_s }.to_json

    redis.publish('timeline:public', payload)
    redis.publish('timeline:public:local', payload)

    if status.media_attachments.any?
      redis.publish('timeline:public:media', payload)
      redis.publish('timeline:public:local:media', payload)
    end

    status.tags.each do |tag|
      redis.publish("timeline:hashtag:#{tag.name.downcase}", payload)
      redis.publish("timeline:hashtag:#{tag.name.downcase}:local", payload)
    end
  end

  def remove_inaccessible_notifications!
    allowed_account_ids = @account.followers.merge(Account.local).select(:id)

    Notification.where(from_account: @account, type: %i(mention quote))
      .where.not(account_id: allowed_account_ids)
      .in_batches
      .destroy_all
  end
end
