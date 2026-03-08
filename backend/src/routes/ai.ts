import { Router } from "express";
import { z } from "zod";
import { env } from "../env";

export const aiRouter = Router();

const generateSchema = z.object({
  prompt: z.string().min(1).max(4000),
});

type MiniMaxResponse = {
  choices?: { message?: { content?: string } }[];
};

aiRouter.post("/ai/generate", async (req, res) => {
  if (!env.MINIMAX_API_KEY) {
    return res.status(400).json({ error: "MiniMax API key not configured" });
  }
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const system =
    "You are a helpful assistant. Respond in Markdown only. Use concise headings, lists, and code blocks when appropriate.";

  const body = {
    model: env.MINIMAX_MODEL || "MiniMax-M2",
    messages: [
      { role: "system", content: system },
      { role: "user", content: parsed.data.prompt }
    ],
    temperature: 0.7,
    max_tokens: 1200
  };

  try {
    const resp = await fetch("https://api.minimax.io/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.MINIMAX_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("MiniMax error", resp.status, text);
      return res.status(502).json({ error: "MiniMax request failed", detail: text });
    }

    const data = (await resp.json()) as MiniMaxResponse;
    const content = data.choices?.[0]?.message?.content || "";
    return res.json({ markdown: content });
  } catch (err) {
    return res.status(502).json({ error: "MiniMax request failed" });
  }
});
