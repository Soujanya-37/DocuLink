import { NextResponse } from "next/server";
import Groq from "groq-sdk";

console.log("🔍 Using Groq API key detected:", !!process.env.GROQ_API_KEY);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req) {
  try {
    const body = await req.json();
    const text = body?.text || "";

    console.log("🧠 Checking plagiarism for text length:", text.length);
    console.log("🔑 GROQ_API_KEY present:", !!process.env.GROQ_API_KEY);

    if (!process.env.GROQ_API_KEY) {
      throw new Error("Missing GROQ_API_KEY in environment");
    }

   const response = await groq.chat.completions.create({
  model: "llama-3.1-8b-instant", // ✅ Updated model
  messages: [
    {
      role: "system",
      content: `
You are a plagiarism detection assistant.
Analyze the user's text for plagiarism likelihood and respond ONLY in valid JSON format like this:
{
  "plagiarism_status": "Likely Copied" | "Mostly Original" | "Completely Original",
  "confidence": number (0-100),
  "indicators": "short reason (max 1-2 lines)"
}
      `,
    },
    { role: "user", content: text },
  ],
});


    const raw = response.choices?.[0]?.message?.content || "{}";
    console.log("🧾 Raw Groq Response:", raw);

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error("⚠️ Failed to parse JSON from Groq:", err);
      // Fallback — attempt to extract numbers/percent if model returned free text (best-effort)
      parsed = {
        plagiarism_status: "Unknown",
        confidence: 0,
        indicators: "Model response could not be parsed as JSON.",
      };
    }

    return NextResponse.json({ result: parsed });
  } catch (error) {
    console.error("❌ Error checking plagiarism:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
