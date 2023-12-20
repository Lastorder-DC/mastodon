# frozen_string_literal: true

class CreateInstanceInfoes < ActiveRecord::Migration[7.0]
  def change
    create_table :instance_infos do |t|
      t.string :domain, null: false, default: '', index: { unique: true }
      t.string :software, null: false, default: ''
      t.string :version, null: false, default: ''
      t.jsonb :data, null: false, default: {}
      t.datetime :created_at, null: false
      t.datetime :updated_at, null: false
    end
  end
end
