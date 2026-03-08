import { Router } from "express";
import { z } from "zod";
import { env } from "../env";

export const aiRouter = Router();

const generateSchema = z.object({
  prompt: z.string().min(1).max(4000),
});

type MiniMaxResponse = {
  choices?: { message?: { content?: string }; text?: string }[];
  reply?: string;
  output?: { text?: string };
  data?: { choices?: { message?: { content?: string }; text?: string }[] };
};

aiRouter.post("/ai/generate", async (req, res) => {
  if (!env.MINIMAX_API_KEY) {
    return res.status(400).json({ error: "MiniMax API key not configured" });
  }
  console.log("MINIMAX_API_KEY length:", env.MINIMAX_API_KEY?.length);
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
    let host = env.MINIMAX_API_HOST || "https://api.minimax.io";
    if (host.endsWith("/")) host = host.slice(0, -1);
    const url = host + "/v1/text/chatcompletion_v2";
    const keyType = env.MINIMAX_KEY_TYPE || "api";
    const authHeader = `Bearer ${env.MINIMAX_API_KEY}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        ...(keyType === "api" && env.MINIMAX_GROUP_ID ? { "Group-Id": env.MINIMAX_GROUP_ID } : {})
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("MiniMax error", resp.status, text);
      return res.status(502).json({ error: "MiniMax request failed", detail: text });
    }

    const data = (await resp.json()) as MiniMaxResponse;
    console.log("MiniMax response", JSON.stringify(data));
    const content =
      data.choices?.[0]?.message?.content ||
      data.choices?.[0]?.text ||
      data.data?.choices?.[0]?.message?.content ||
      data.data?.choices?.[0]?.text ||
      data.reply ||
      data.output?.text ||
      "";
    return res.json({
      markdown: content,
      ...(content ? {} : env.NODE_ENV !== "production" ? { raw: data } : {})
    });
  } catch (err) {
    return res.status(502).json({ error: "MiniMax request failed" });
  }
});
