import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { text } = await request.json();
    if (!text || typeof text !== 'string') return NextResponse.json({ error: 'text required' }, { status: 400 });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 });

    const body = {
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: 'You are a concise assistant. Summarize clearly and briefly.' },
        { role: 'user', content: `Summarize this content:
${text}` }
      ],
      temperature: 0.2,
      max_tokens: 256,
    } as any;

    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!resp.ok) {
      const t = await resp.text();
      return NextResponse.json({ error: 'groq failed', detail: t }, { status: 502 });
    }
    const data = await resp.json();
    const summary = data?.choices?.[0]?.message?.content ?? '';
    return NextResponse.json({ summary });
  } catch (e) {
    console.error('summarize failed', e);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}


