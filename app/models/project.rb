class Project < ActiveRecord::Base
  belongs_to :user
  has_many :videos
  def to_s
    name
  end
end
