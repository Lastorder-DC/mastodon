# frozen_string_literal: true

class EmojiReactionAccountsPresenter
  attr_reader :permitted_account_ids

  def initialize(statuses, current_account_id = nil, **_options)
    @current_account_id = current_account_id

    statuses            = statuses.compact
    status_ids          = statuses.flat_map { |s| [s.id, s.reblog_of_id] }.uniq.compact
    emoji_reactions     = EmojiReaction.where(status_id: status_ids)
    account_ids         = emoji_reactions.pluck(:account_id).uniq

    permitted_accounts  = Account.where(id: account_ids, silenced_at: nil, suspended_at: nil)
    if current_account_id.present?
      account = Account.find(current_account_id)
      permitted_accounts = permitted_accounts.where('domain IS NULL OR domain NOT IN (?)', account.excluded_from_timeline_domains) if account.present? && account.excluded_from_timeline_domains.size.positive?
    end

    @permitted_account_ids = permitted_accounts.pluck(:id)
  end
end
