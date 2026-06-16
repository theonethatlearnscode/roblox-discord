import { CodeBlock } from "@/components/code-block"

const luaScript = `--// Place inside ServerScriptService (Script).
local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

local ENDPOINT_URL = "YOUR_VERCEL_URL/api/roblox"
local API_KEY      = "API_KEY"

local function sendEvent(eventType, player, message)
	local payload = {
		event = eventType,
		username = player.Name,
		displayName = player.DisplayName,
		userId = player.UserId,
		message = message or nil,
		jobId = game.JobId,
		placeId = game.PlaceId,
		timestamp = os.time(),
		apiKey = API_KEY,
	}
	pcall(function()
		HttpService:RequestAsync({
			Url = ENDPOINT_URL,
			Method = "POST",
			Headers = {
				["Content-Type"] = "application/json",
				["x-api-key"] = API_KEY,
			},
			Body = HttpService:JSONEncode(payload),
		})
	end)
end

Players.PlayerAdded:Connect(function(player)
	sendEvent("player_join", player)
	player.Chatted:Connect(function(msg)
		sendEvent("player_chat", player, msg)
	end)
end)

Players.PlayerRemoving:Connect(function(player)
	sendEvent("player_leave", player)
end)`

const payloadExample = `{
  "event": "player_chat",
  "username": "PlayerName",
  "displayName": "Display Name",
  "userId": 123456,
  "message": "Hello world",
  "jobId": "server_job_id",
  "placeId": 123456789,
  "timestamp": 1234567890
}`

const curlExample = `curl -X POST https://YOUR_VERCEL_URL/api/roblox \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: API_KEY" \\
  -d '{
    "event": "player_join",
    "username": "Builderman",
    "displayName": "Builderman",
    "userId": 156,
    "jobId": "abc-123",
    "placeId": 1818,
    "timestamp": 1700000000
  }'`

const events = [
  { type: "player_join", title: "Player Joined", color: "bg-emerald-500", label: "Green" },
  { type: "player_leave", title: "Player Left", color: "bg-red-500", label: "Red" },
  { type: "player_chat", title: "Chat Message", color: "bg-blue-500", label: "Blue" },
]

const envVars = [
  { key: "DISCORD_WEBHOOK", desc: "Your Discord channel webhook URL." },
  { key: "API_KEY", desc: "A secret key Roblox must send with every request." },
]

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-12">
        <p className="mb-2 font-mono text-sm text-muted-foreground">Roblox → Discord</p>
        <h1 className="text-balance text-4xl font-semibold tracking-tight">Event Bridge</h1>
        <p className="mt-4 max-w-prose leading-relaxed text-muted-foreground">
          A secure Vercel serverless endpoint that forwards Roblox game events — joins, leaves, and chat — to Discord as
          rich embeds. Authenticated with an API key.
        </p>
      </header>

      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold">Supported events</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {events.map((e) => (
            <div key={e.type} className="rounded-lg border border-border p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className={`size-3 rounded-full ${e.color}`} aria-hidden />
                <span className="text-xs text-muted-foreground">{e.label}</span>
              </div>
              <p className="font-medium">{e.title}</p>
              <code className="mt-1 block font-mono text-xs text-muted-foreground">{e.type}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold">1. Environment variables</h2>
        <p className="mb-4 leading-relaxed text-muted-foreground">
          Add these in your Vercel project under Settings → Environment Variables.
        </p>
        <div className="overflow-hidden rounded-lg border border-border">
          {envVars.map((v, i) => (
            <div
              key={v.key}
              className={`flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:gap-4 ${
                i > 0 ? "border-t border-border" : ""
              }`}
            >
              <code className="font-mono text-sm font-medium">{v.key}</code>
              <span className="text-sm text-muted-foreground">{v.desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold">2. The endpoint</h2>
        <p className="mb-4 leading-relaxed text-muted-foreground">
          Roblox sends a POST to <code className="font-mono text-sm">/api/roblox</code> with the API key in the{" "}
          <code className="font-mono text-sm">x-api-key</code> header. Expected payload:
        </p>
        <CodeBlock code={payloadExample} language="json" />
        <p className="mb-4 mt-6 leading-relaxed text-muted-foreground">Test it from your terminal:</p>
        <CodeBlock code={curlExample} language="bash" />
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold">3. Roblox script</h2>
        <p className="mb-4 leading-relaxed text-muted-foreground">
          Enable HTTP requests (Game Settings → Security), then place this in a Script inside ServerScriptService. The
          full version with comments lives at <code className="font-mono text-sm">roblox/DiscordBridge.server.lua</code>.
        </p>
        <CodeBlock code={luaScript} language="lua" />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">4. Deploy</h2>
        <ol className="list-inside list-decimal space-y-2 leading-relaxed text-muted-foreground">
          <li>Push this project to Vercel (or click Publish).</li>
          <li>Set DISCORD_WEBHOOK and API_KEY in project settings.</li>
          <li>Copy your deployment URL into the Roblox script&apos;s ENDPOINT_URL.</li>
          <li>Use the same API_KEY value in both places.</li>
        </ol>
      </section>
    </main>
  )
}
