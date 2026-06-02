# frozen_string_literal: true

class REST::NotificationSerializer < ActiveModel::Serializer
  include RoutingHelper
  include ActionView::Helpers::UrlHelper
  include NotificationFallbackConcern

  # Please update app/javascript/mastodon/api_types/notifications.ts when making changes to the attributes
  attributes :id, :type, :created_at, :group_key

  attribute :filtered, if: :filtered?

  attribute :fallback, if: :needs_fallback?

  belongs_to :from_account, key: :account, serializer: REST::AccountSerializer
  belongs_to :target_status, key: :status, if: :status_type?, serializer: REST::StatusSerializer
  belongs_to :report, if: :report_type?, serializer: REST::ReportSerializer
  belongs_to :account_relationship_severance_event, key: :event, if: :relationship_severance_event?, serializer: REST::AccountRelationshipSeveranceEventSerializer
  belongs_to :account_warning, key: :moderation_warning, if: :moderation_warning_event?, serializer: REST::AccountWarningSerializer
  belongs_to :target_collection, key: :collection, if: :collection_type?, serializer: REST::CollectionSerializer
  belongs_to :community_group_join_request, key: :group_join_request, if: :community_group_join_request_type?, serializer: REST::CommunityGroupJoinRequestSerializer
  belongs_to :community_group_report, key: :group_report, if: :community_group_report_type?, serializer: REST::CommunityGroupReportSerializer

  def id
    object.id.to_s
  end

  def group_key
    object.group_key || "ungrouped-#{object.id}"
  end

  def status_type?
    [:favourite, :reblog, :status, :mention, :poll, :update, :quoted_update, :quote, :community_group_status_removed_by_admin, :community_group_status_removed_by_moderator].include?(object.type)
  end

  def community_group_join_request_type?
    [:community_group_join_request, :community_group_join_request_approved, :community_group_join_request_rejected].include?(object.type)
  end

  def community_group_report_type?
    object.type == :community_group_report
  end

  def collection_type?
    [:added_to_collection, :collection_update].include?(object.type)
  end

  def report_type?
    object.type == :'admin.report'
  end

  def relationship_severance_event?
    object.type == :severed_relationships
  end

  def moderation_warning_event?
    object.type == :moderation_warning
  end

  delegate :filtered?, to: :object
end
