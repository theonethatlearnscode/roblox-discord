import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

const WEBHOOK = process.env.DISCORD_WEBHOOK
const API_KEY = process.env.API_KEY

async function avatar(userId: number): Promise<string> {
  const res = await fetch(
    `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=true`
  )

  const data = await res.json()
  return data.data?.[0]?.imageUrl
}

export async function POST(req: NextRequest) {
  if (!WEBHOOK || !API_KEY) {
    return NextResponse.json({ error: "Missing env vars" }, { status: 500 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 })
  }

  if (body.apiKey !== API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const pfp = await avatar(body.userId)

  let embed: any = {
    author: {
      name: `${body.displayName} (@${body.username})`,
      icon_url: pfp,
    },
    footer: {
      text: `UserId: ${body.userId}`,
    },
    timestamp: new Date().toISOString(),
  }

  if (body.event === "join") {
    embed.title = "Player Joined"
    embed.color = 0x2ecc71
  }

  if (body.event === "leave") {
    embed.title = "Player Left"
    embed.color = 0xe74c3c
  }

  if (body.event === "chat") {
    embed.title = "Chat Message"
    embed.color = 0x3498db
    embed.description = body.message || ""
  }

  await fetch(WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [embed] }),
  })

  return NextResponse.json({ ok: true })
}
