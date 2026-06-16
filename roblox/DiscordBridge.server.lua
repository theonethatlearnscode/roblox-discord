--[[
============================================================================
  Roblox -> Discord Bridge
  Place this Script inside ServerScriptService.
  It detects player join / leave / chat events and forwards them to your
  Vercel endpoint, which relays them to Discord as rich embeds.

  IMPORTANT:
  1. HttpService requests must be enabled:
       Game Settings > Security > Allow HTTP Requests  (toggle ON)
  2. Replace the three CONFIG values below.
============================================================================
]]

--// Services
local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

--============================================================================
--// CONFIG  -- replace these three values
--============================================================================
local ENDPOINT_URL = "YOUR_VERCEL_URL/api/roblox" -- e.g. https://my-app.vercel.app/api/roblox
local API_KEY      = "API_KEY"                     -- must match the API_KEY env var on Vercel
--============================================================================

--[[
  sendEvent
  Builds the payload, serializes it to JSON, and POSTs it to the endpoint.
  Wrapped in pcall so a network/HTTP failure never breaks the game.
]]
local function sendEvent(eventType, player, message)
	-- Build the payload exactly in the format the endpoint expects.
	local payload = {
		event       = eventType,                 -- "player_join" | "player_leave" | "player_chat"
		username    = player.Name,               -- account username
		displayName = player.DisplayName,         -- nickname / display name
		userId      = player.UserId,              -- numeric Roblox user id
		message     = message or nil,             -- only present for chat events
		jobId       = game.JobId,                 -- unique server instance id
		placeId     = game.PlaceId,               -- the place (game) id
		timestamp   = os.time(),                  -- UNIX time in seconds
		apiKey      = API_KEY,                     -- auth (also sent as a header below)
	}

	-- Encode to JSON. Wrapped in pcall in case encoding ever fails.
	local ok, encoded = pcall(function()
		return HttpService:JSONEncode(payload)
	end)

	if not ok then
		warn("[DiscordBridge] Failed to encode payload:", encoded)
		return
	end

	-- Perform the HTTP POST. pcall prevents errors from propagating.
	local success, response = pcall(function()
		return HttpService:RequestAsync({
			Url = ENDPOINT_URL,
			Method = "POST",
			Headers = {
				["Content-Type"] = "application/json",
				["x-api-key"] = API_KEY, -- API key sent as a header for security
			},
			Body = encoded,
		})
	end)

	-- Handle the result / log helpful diagnostics.
	if not success then
		warn("[DiscordBridge] HTTP request errored:", response)
	elseif not response.Success then
		warn(("[DiscordBridge] Endpoint returned %d: %s")
			:format(response.StatusCode, tostring(response.Body)))
	end
end

--============================================================================
--// EVENT HOOKS
--============================================================================

-- 1. PlayerAdded -> player_join, and wire up chat for that player.
Players.PlayerAdded:Connect(function(player)
	-- Forward the join event.
	sendEvent("player_join", player)

	-- 3. player.Chatted -> player_chat
	-- Connect a chat listener for this specific player.
	player.Chatted:Connect(function(message)
		sendEvent("player_chat", player, message)
	end)
end)

-- 2. PlayerRemoving -> player_leave
Players.PlayerRemoving:Connect(function(player)
	sendEvent("player_leave", player)
end)

-- Handle players who joined before this script ran (e.g. Studio quick play).
for _, player in ipairs(Players:GetPlayers()) do
	sendEvent("player_join", player)
	player.Chatted:Connect(function(message)
		sendEvent("player_chat", player, message)
	end)
end

print("[DiscordBridge] Roblox -> Discord bridge initialized.")
