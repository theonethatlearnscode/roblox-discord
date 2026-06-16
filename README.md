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
