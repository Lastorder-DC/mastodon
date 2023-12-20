# frozen_string_literal: true

class AddStlToAntennas < ActiveRecord::Migration[6.1]
  def change
    safety_assured do
      add_column :antennas, :stl, :boolean, null: false, default: false
      add_index :antennas, :stl
    end
  end
end
