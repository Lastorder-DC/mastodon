# frozen_string_literal: true

class AddCommunityGroupFieldsToStatuses < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def change
    # 1. 컬럼 추가 (외래 키 자동 생성 옵션 제외)
    add_reference :statuses, :community_group, index: false
    add_column :statuses, :community_group_approval_status, :integer
    add_column :statuses, :community_group_dm, :boolean, null: false, default: false

    # 2. 인덱스 추가 (동시성 옵션 유지)
    add_index :statuses, :community_group_id, where: 'community_group_id IS NOT NULL', algorithm: :concurrently
    add_index :statuses, [:community_group_id, :id], where: 'community_group_id IS NOT NULL AND deleted_at IS NULL', algorithm: :concurrently
    add_index :statuses, :community_group_approval_status, where: 'community_group_approval_status IS NOT NULL', name: 'index_statuses_on_community_group_approval_status', algorithm: :concurrently

    # 3. 데이터베이스 잠금을 피하기 위해 검증(validate: false) 없이 외래 키 추가
    add_foreign_key :statuses, :community_groups, column: :community_group_id, on_delete: :nullify, validate: false

    # 4. 방금 추가한 외래 키를 안전하게 검증
    validate_foreign_key :statuses, :community_groups
  end
end
