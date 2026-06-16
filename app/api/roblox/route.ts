import { type NextRequest, NextResponse } from "next/server"

// Run on the Node.js runtime (serverless function) so we can use fetch + env vars reliably.
export const runtime = "nodejs"
// Never cache responses — this is a webhook bridge.
export const dynamic = "force-dynamic"

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

type RobloxEventType = "player_join" | "player_leave" | "player_chat"

interface RobloxPayload {
  event: RobloxEventType
  username: string
  displayName: string
  userId: number
  message?: string
  jobId: string
  placeId: number
  timestamp: number
}

// Discord embed colors (decimal integers).
const COLOR_GREEN = 0x2ecc71 // Player Join
const COLOR_RED = 0xe74c3c // Player Leave
const COLOR_BLUE = 0x3498db // Player Chat

// ----------------------------------------------------------------------------
// Validation helpers
// ----------------------------------------------------------------------------

const VALID_EVENTS: RobloxEventType[] = ["player_join", "player_leave", "player_chat"]

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

/**
 * Validates an unknown body and returns a typed payload, or an error message.
 * This prevents malformed payloads from crashing the function.
 */
function validatePayload(body: unknown): { ok: true; data: RobloxPayload } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Request body must be a JSON object." }
  }

  const b = body as Record<string, unknown>

  if (!isNonEmptyString(b.event) || !VALID_EVENTS.includes(b.event as RobloxEventType)) {
    return { ok: false, error: `Invalid "event". Must be one of: ${VALID_EVENTS.join(", ")}.` }
  }
  if (!isNonEmptyString(b.username)) {
    return { ok: false, error: 'Invalid "username".' }
  }
  if (!isNonEmptyString(b.displayName)) {
    return { ok: false, error: 'Invalid "displayName".' }
  }
  if (!isFiniteNumber(b.userId)) {
    return { ok: false, error: 'Invalid "userId".' }
  }
  if (!isNonEmptyString(b.jobId)) {
    return { ok: false, error: 'Invalid "jobId".' }
  }
  if (!isFiniteNumber(b.placeId)) {
    return { ok: false, error: 'Invalid "placeId".' }
  }
  if (!isFiniteNumber(b.timestamp)) {
    return { ok: false, error: 'Invalid "timestamp".' }
  }
  if (b.event === "player_chat" && !isNonEmptyString(b.message)) {
    return { ok: false, error: 'Invalid "message" for player_chat event.' }
  }

  return {
    ok: true,
    data: {
      event: b.event as RobloxEventType,
      username: b.username as string,
      displayName: b.displayName as string,
      userId: b.userId as number,
      message: typeof b.message === "string" ? b.message : undefined,
      jobId: b.jobId as string,
      placeId: b.placeId as number,
      timestamp: b.timestamp as number,
    },
  }
}

// ----------------------------------------------------------------------------
// Discord embed builder
// ----------------------------------------------------------------------------

function buildEmbed(data: RobloxPayload) {
  // Roblox sends UNIX seconds; Discord timestamps expect ISO-8601.
  const isoTime = new Date(data.timestamp * 1000).toISOString()
  // Discord renders <t:UNIX:F> as a localized full date/time for each viewer.
  const timeField = `<t:${Math.floor(data.timestamp)}:F>`

  const baseFields = [
    { name: "Username", value: `\`${data.username}\``, inline: true },
    { name: "Display Name", value: `\`${data.displayName}\``, inline: true },
    { name: "UserId", value: `\`${data.userId}\``, inline: true },
  ]

  const footer = { text: `PlaceId: ${data.placeId} • JobId: ${data.jobId}` }

  switch (data.event) {
    case "player_join":
      return {
        title: "Player Joined",
        color: COLOR_GREEN,
        fields: [...baseFields, { name: "Time", value: timeField, inline: false }],
        footer,
        timestamp: isoTime,
      }
    case "player_leave":
      return {
        title: "Player Left",
        color: COLOR_RED,
        fields: [...baseFields, { name: "Time", value: timeField, inline: false }],
        footer,
        timestamp: isoTime,
      }
    case "player_chat":
      return {
        title: "Chat Message",
        color: COLOR_BLUE,
        fields: [
          ...baseFields,
          // Truncate to Discord's 1024-char field limit to avoid rejections.
          { name: "Message", value: (data.message ?? "").slice(0, 1024), inline: false },
          { name: "Time", value: timeField, inline: false },
        ],
        footer,
        timestamp: isoTime,
      }
  }
}

// ----------------------------------------------------------------------------
// POST handler — the endpoint Roblox calls.
// ----------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // 1. Ensure the server is configured.
  const webhookUrl = process.env.DISCORD_WEBHOOK
  const expectedKey = process.env.API_KEY

  if (!webhookUrl || !expectedKey) {
    return NextResponse.json({ error: "Server is not configured. Missing DISCORD_WEBHOOK or API_KEY." }, { status: 500 })
  }

  // 2. Verify the API key. Accept either the "x-api-key" header or an "apiKey" body field.
  const headerKey = req.headers.get("x-api-key")

  // 3. Safely parse the JSON body. Malformed JSON must not crash the function.
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const bodyKey =
  typeof body === "object" && body !== null && typeof (body as any).apiKey === "string"
    ? (body as any).apiKey
    : null

  const providedKey = headerKey || bodyKey

  if (providedKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized: invalid or missing API key." }, { status: 401 })
  }

  // 4. Validate the payload shape.
  const result = validatePayload(body)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 })
  }

  // 5. Build the embed and forward it to Discord.
  const embed = buildEmbed(result.data)

  try {
    const discordRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    })

    if (!discordRes.ok) {
      const detail = await discordRes.text().catch(() => "")
      return NextResponse.json(
        { error: "Failed to deliver message to Discord.", status: discordRes.status, detail: detail.slice(0, 500) },
        { status: 502 },
      )
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Network error while contacting Discord.", detail: err instanceof Error ? err.message : "unknown" },
      { status: 502 },
    )
  }

  // 6. Success.
  return NextResponse.json({ ok: true, event: result.data.event }, { status: 200 })
}

// Reject other methods cleanly.
export async function GET() {
  return NextResponse.json({ error: "Method not allowed. Use POST." }, { status: 405 })
}
