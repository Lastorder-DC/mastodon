# frozen_string_literal: true

class StatusPolicy < ApplicationPolicy
  def show?
    return false if author.unavailable?
    return false if occm_group_post? && !viewable_for_occm_group?

    if requires_mention?
      owned? || mention_exists?
    elsif private?
      owned? || following_author? || mention_exists?
    else
      current_account.nil? || (!author_blocking? && !author_blocking_domain?)
    end
  end

  def quote?
    show? && !blocking_author? && record.quote_policy_for_account(current_account) != :denied
  end

  def reblog?
    !requires_mention? && (!private? || owned?) && show? && !blocking_author?
  end

  def favourite?
    show? && !blocking_author?
  end

  def destroy?
    owned?
  end

  alias unreblog? destroy?

  def update?
    owned?
  end

  private

  def requires_mention?
    record.direct_visibility? || record.limited_visibility?
  end

  def occm_group_post?
    record.limited_visibility? && OccmGroupStatus.exists?(status_id: record.id)
  end

  def viewable_for_occm_group?
    return true if owned?

    occm_group_status = OccmGroupStatus.find_by(status_id: record.id)
    return true if occm_group_status.nil?

    OccmGroupMembership.exists?(
      occm_group_id: occm_group_status.occm_group_id,
      account_id: current_account&.id,
      state: :active
    )
  end

  def owned?
    author.id == current_account&.id
  end

  def private?
    record.private_visibility?
  end

  def mention_exists?
    return false if current_account.nil?

    if record.mentions.loaded?
      record.mentions.any? { |mention| mention.account_id == current_account.id }
    else
      record.mentions.exists?(account: current_account)
    end
  end

  def author_blocking_domain?
    return false if current_account.nil? || current_account.domain.nil?

    author.domain_blocking?(current_account.domain)
  end

  def blocking_author?
    return false if current_account.nil?

    current_account.blocking?(author)
  end

  def author_blocking?
    return false if current_account.nil?

    current_account.blocked_by?(author)
  end

  def following_author?
    return false if current_account.nil?

    current_account.following?(author)
  end

  def author
    record.account
  end
end
