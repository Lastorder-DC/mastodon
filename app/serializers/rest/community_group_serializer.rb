# frozen_string_literal: true

class REST::CommunityGroupSerializer < ActiveModel::Serializer
  attributes :id, :display_name, :created_at, :note, :url, :locked, :discoverable, :members_count, :statuses_count, :last_status_at

  def id
    object.id.to_s
  end

  def url
    ActivityPub::TagManager.instance.url_for(object.owner_account).then { |account_url| [account_url, 'groups', object.slug].join('/') }
  end
end
