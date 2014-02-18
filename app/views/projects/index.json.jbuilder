json.array!(@projects) do |project|
  json.extract! project, :id, :name, :description, :start, :finish
  json.url project_url(project, format: :json)
end
