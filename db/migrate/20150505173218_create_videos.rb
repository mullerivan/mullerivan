class CreateVideos < ActiveRecord::Migration
  def change
    create_table :videos do |t|
      t.string :name
      t.text :description, :precision => 8, :scale => 2
      t.references :project, index: true
      t.binary :video
      t.decimal :meters

      t.timestamps
    end
  end
end
