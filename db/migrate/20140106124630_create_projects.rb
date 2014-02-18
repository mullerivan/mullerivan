class CreateProjects < ActiveRecord::Migration
  def change
    create_table :projects do |t|
      t.string :name
      t.string :position
      t.string :client
      t.text :description
      t.integer :duration

      t.timestamps
    end
  end
end
