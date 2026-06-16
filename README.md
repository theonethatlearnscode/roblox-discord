# Roblox → Discord Event Bridge

A secure Vercel serverless endpoint that forwards Roblox player **join**, **leave**, and **chat** events to a Discord channel as rich, color-coded embeds.

- 🟢 **Join** events → green embed
- 🔴 **Leave** events → red embed
- 🔵 **Chat** messages → blue embed

Requests are authenticated with a secret API key, so only your Roblox game can post to your Discord.

## Deploy your own

Each person runs their own isolated instance pointed at their own Discord server. Click the button below — Vercel will clone this repo into your account and prompt you for the required environment variables during setup.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/theonethatlearnscode/roblox-discord&env=DISCORD_WEBHOOK,API_KEY&envDescription=Your%20Discord%20webhook%20URL%20and%20a%20secret%20API%20key%20you%20choose&envLink=https://github.com/theonethatlearnscode/roblox-discord%23environment-variables)

## Environment variables

| Variable          | Where it comes from | Description |
| ----------------- | ------------------- | ----------- |
| `DISCORD_WEBHOOK` | **Discord**         | The webhook URL that messages are posted to. |
| `API_KEY`         | **You invent it**   | A secret shared password. The Roblox script must send this exact value. |

> `API_KEY` does **not** come from Roblox. It is a secret you make up yourself so only your game can call your endpoint. Generate one with `openssl rand -base64 32`, or use any long random string.

## Setup instructions

### 1. Create a Discord webhook

1. In Discord, open the target channel → **Edit Channel** → **Integrations** → **Webhooks**.
2. Click **New Webhook**, give it a name, then **Copy Webhook URL**.
3. This URL is your `DISCORD_WEBHOOK` value.

### 2. Deploy to Vercel

1. Click the **Deploy with Vercel** button above.
2. When prompted, paste your `DISCORD_WEBHOOK` and enter an `API_KEY` of your choosing.
3. After deploying, copy your deployment URL (e.g. `https://your-project.vercel.app`).
   - Your endpoint is `https://your-project.vercel.app/api/roblox`.

> Already deployed? Add or edit these in **Vercel → Project → Settings → Environment Variables**, then redeploy.

### 3. Configure the Roblox script

1. Open your game in **Roblox Studio**.
2. Add `roblox/DiscordBridge.server.lua` as a **Script** inside **ServerScriptService**.
3. At the top of the script, set:
   - `ENDPOINT_URL` → your `https://your-project.vercel.app/api/roblox` URL
   - `API_KEY` → the **same** secret you set in Vercel (they must match exactly)
4. Enable HTTP requests: **Game Settings → Security → Allow HTTP Requests** → **On**.

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
