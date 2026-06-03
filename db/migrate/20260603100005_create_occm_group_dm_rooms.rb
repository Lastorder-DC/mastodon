# frozen_string_literal: true

class CreateOccmGroupDmRooms < ActiveRecord::Migration[8.0]
  def change
    create_table :occm_group_dm_rooms do |t|
      t.references :occm_group, null: false, foreign_key: { on_delete: :cascade }
      t.string :title, default: '', null: false
      t.timestamps
    end
  end
end
