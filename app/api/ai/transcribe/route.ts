import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 });

    const form = await request.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 });

    const groqForm = new FormData();
    groqForm.append('file', file, file.name);
    groqForm.append('model', 'whisper-large-v3-turbo');
    groqForm.append('response_format', 'json');

    const resp = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: groqForm as any
    });
    if (!resp.ok) {
      const t = await resp.text();
      return NextResponse.json({ error: 'groq whisper failed', detail: t }, { status: 502 });
    }
    const data = await resp.json();
    const text = data?.text || '';
    return NextResponse.json({ text });
  } catch (e) {
    console.error('transcribe failed', e);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}


