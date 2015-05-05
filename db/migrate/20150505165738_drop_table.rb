class DropTable < ActiveRecord::Migration
  def change
    drop_table('headshot_photos')
  end
end
