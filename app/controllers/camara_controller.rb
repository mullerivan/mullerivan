class CamaraController < ApplicationController
  before_action :authenticate_user!
  protect_from_forgery except: :upload

  def index
    # current_user
    # user_session
  	# https://github.com/streamproc/MediaStreamRecorder
  	# https://www.webrtc-experiment.com/
  end

  def upload
    # raise params.inspect
    video = params[:'video-blob']

    File.open('/tmp/test.wb', 'wb') do |f|
      f.write video.read
    end

    respond_to do |format|
      format.html { render nothing: :true }
      format.js { render nothing: :true }
    end
  end
end
