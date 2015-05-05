json.array!(@videos) do |video|
  json.extract! video, :id, :name, :description, :project_id, :video, :meters
  json.url video_url(video, format: :json)
end
