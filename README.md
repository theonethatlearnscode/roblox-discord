# Roblox → Discord Event Bridge

A secure Vercel serverless endpoint that forwards Roblox player **join**, **leave**, and **chat** events to a Discord channel as rich, color-coded embeds.

- 🟢 **Join** events → green embed
- 🔴 **Leave** events → red embed
- 🔵 **Chat** messages → blue embed

Requests are authenticated with a secret API key, so only your Roblox game can post to your Discord.

## 🚀 One-click deploy

**Click this button, fill in 2 boxes, done.**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/theonethatlearnscode/roblox-discord&env=DISCORD_WEBHOOK,API_KEY&envDescription=Your%20Discord%20webhook%20URL%20and%20a%20secret%20API%20key%20you%20choose&envLink=https://github.com/theonethatlearnscode/roblox-discord%23environment-variables)

When Vercel opens, it asks you for exactly two things:

| Box on the Vercel screen | What to paste in |
| ------------------------ | ---------------- |
| **`DISCORD_WEBHOOK`** | Your Discord webhook URL — Discord → channel **Edit Channel → Integrations → Webhooks → New Webhook → Copy URL** |
| **`API_KEY`** | Any password you make up, e.g. `mysecret123xyz`. Just remember it — you paste the same one into Roblox. |

Then click **Deploy** and wait ~1 minute. That's it.

### After it deploys

Vercel gives you a URL like `https://your-project.vercel.app`. Your endpoint is that URL **+ `/api/roblox`**:

```
https://your-project.vercel.app/api/roblox
```

Copy that — you paste it into the Roblox script ([step 3](#3-add-the-script-to-roblox-studio)).

> **Need to change `DISCORD_WEBHOOK` or `API_KEY` later?** In Vercel: **your project → Settings → Environment Variables**. Edit the value, then go to the **Deployments** tab and **Redeploy** the latest one for it to take effect.

## Does anything need to stay on / running?

**No.** You do **not** need to keep a server running, a browser tab open, or your computer on.

This runs as a **Vercel Serverless Function**. It is *not* a bot that has to stay online. Vercel automatically wakes the function the instant your Roblox game sends an event, forwards it to Discord, and then shuts it back down — all in a fraction of a second. You deploy it **once** and it stays live 24/7 on its own.

The only requirements are:

- The Vercel deployment exists (deploy once — don't delete the project).
- `DISCORD_WEBHOOK` and `API_KEY` are set in the project's environment variables.

That's it. Your PC can be off and events will still reach Discord.

## Environment variables (reference)

| Variable          | Where it comes from | Description |
| ----------------- | ------------------- | ----------- |
| `DISCORD_WEBHOOK` | **Discord**         | The webhook URL that messages are posted to. |
| `API_KEY`         | **You invent it**   | A secret shared password. The Roblox script must send this exact value. |

> `API_KEY` does **not** come from Roblox. It is a secret you make up yourself so only your game can call your endpoint.

## Setup instructions

### 1. Create a Discord webhook

1. In Discord, open the target channel → **Edit Channel** → **Integrations** → **Webhooks**.
2. Click **New Webhook**, give it a name, then **Copy Webhook URL**.
3. This URL is your `DISCORD_WEBHOOK` value.

### 2. Deploy to Vercel

Use the **One-click deploy** button at the top. Paste your `DISCORD_WEBHOOK` and a made-up `API_KEY`, click Deploy, then copy your `https://your-project.vercel.app/api/roblox` endpoint URL.

### 3. Add the script to Roblox Studio

1. Open your game in **Roblox Studio**.
2. In the **Explorer**, hover over **ServerScriptService**, click the **+**, and add a **Script**.
3. Delete the default contents and **paste the full script below**.
4. Edit the two `CONFIG` values at the top:
   - `ENDPOINT_URL` → your `https://your-project.vercel.app/api/roblox` URL
   - `API_KEY` → the **same** secret you set in Vercel (they must match exactly)
5. Enable HTTP requests: **Game Settings → Security → Allow HTTP Requests** → **On**.

<details>
<summary><strong>Click to expand the full Roblox script (copy-paste this)</strong></summary>

```lua
--[[
============================================================================
  Roblox -> Discord Bridge
  Place this Script inside ServerScriptService.
  It detects player join / leave / chat events and forwards them to your
  Vercel endpoint, which relays them to Discord as rich embeds.

  IMPORTANT:
  1. HttpService requests must be enabled:
       Game Settings > Security > Allow HTTP Requests  (toggle ON)
  2. Replace the two CONFIG values below.
============================================================================
]]

--// Services
local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

--============================================================================
--// CONFIG  -- replace these two values
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
```

</details>

### 4. Test it

Run the game in Studio or join your live experience. Joining, leaving, and chatting should post embeds to your Discord channel.

## Request format

The endpoint accepts `POST /api/roblox` with header `x-api-key: <API_KEY>` and a JSON body:

```json
{
  "type": "join",            // "join" | "leave" | "chat"
  "playerName": "Builderman",
  "userId": 156,
  "message": "hello world"   // required only for "type": "chat"
}
```

Responses use standard status codes: `200` success, `400` malformed body, `401` bad/missing key, `422` invalid fields, `502` Discord rejected the message.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the docs page. Create a `.env.local` from `.env.example` and fill in `DISCORD_WEBHOOK` and `API_KEY` to test the endpoint locally.

## Built with v0

This repository is linked to a [v0](https://v0.app) project. Start new chats to make changes, and v0 will push commits directly to this repo.

[Continue working on v0 →](https://v0.app/chat/projects/prj_8FHlOFQ0ZQWule8VirHbNZ3sBf6Z)
