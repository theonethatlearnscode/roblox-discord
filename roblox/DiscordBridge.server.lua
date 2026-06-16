local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

local WEBHOOK_ENDPOINT = "WEBHOOK_ENDPOINT_VERCEL"
local API_KEY = "API_KEY"

local function send(eventType, player, message)
	local payload = {
		apiKey = API_KEY,
		event = eventType,
		username = player.Name,
		displayName = player.DisplayName,
		userId = player.UserId,
		message = message,
	}

	pcall(function()
		HttpService:PostAsync(
			WEBHOOK_ENDPOINT,
			HttpService:JSONEncode(payload),
			Enum.HttpContentType.ApplicationJson
		)
	end)
end

Players.PlayerAdded:Connect(function(player)
	send("join", player)

	player.Chatted:Connect(function(msg)
		send("chat", player, msg)
	end)
end)

Players.PlayerRemoving:Connect(function(player)
	send("leave", player)
end)
