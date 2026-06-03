# frozen_string_literal: true

class ValidateOccmGroupReportsForeignKeys < ActiveRecord::Migration[8.0]
  def change
    validate_foreign_key :occm_group_reports, :accounts, column: :target_account_id
    validate_foreign_key :occm_group_reports, :accounts, column: :action_taken_by_account_id
  end
end
