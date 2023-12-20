# frozen_string_literal: true

class ActivityPub::FetchReferencesService < BaseService
  include JsonLdHelper

  def call(status, collection_or_uri)
    @account = status.account

    collection_items(collection_or_uri)&.map { |item| value_or_id(item) }
  end

  private

  def collection_items(collection_or_uri)
    collection = fetch_collection(collection_or_uri)
    return unless collection.is_a?(Hash)

    collection = fetch_collection(collection['first']) if collection['first'].present?
    return unless collection.is_a?(Hash)

    case collection['type']
    when 'Collection', 'CollectionPage'
      collection['items']
    when 'OrderedCollection', 'OrderedCollectionPage'
      collection['orderedItems']
    end
  end

  def fetch_collection(collection_or_uri)
    return collection_or_uri if collection_or_uri.is_a?(Hash)
    return if unsupported_uri_scheme?(collection_or_uri)
    return if ActivityPub::TagManager.instance.local_uri?(collection_or_uri)

    fetch_resource_without_id_validation(collection_or_uri, nil, true)
  end
end
