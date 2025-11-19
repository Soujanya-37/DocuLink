import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { currentText, previousText, meta } = await request.json();
    if (typeof currentText !== 'string' || typeof previousText !== 'string') {
      return NextResponse.json({ error: 'currentText and previousText required' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 });

    const prompt = `You are a diff explainer. Compare two versions of a document and produce:
- High-level summary of changes
- Lists of additions, deletions, and edits
- Impact on meaning/tone
Be concise. Use bullet points and short snippets.

Previous version:\n${previousText}\n\nCurrent version:\n${currentText}`;

    const body = {
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: 'Explain diffs clearly, focusing on what changed and why it matters.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 400,
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
    const analysis = data?.choices?.[0]?.message?.content ?? '';
    return NextResponse.json({ analysis });
  } catch (e) {
    console.error('diff analysis failed', e);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}


