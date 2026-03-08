import { Router } from "express";
import MarkdownIt from "markdown-it";
import texmath from "markdown-it-texmath";
import katex from "katex";

export const renderRouter = Router();

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
}).use(texmath, {
  engine: katex,
  delimiters: "dollars",
  katexOptions: { throwOnError: false }
});

renderRouter.post("/render", (req, res) => {
  const content = typeof req.body?.content === "string" ? req.body.content : "";
  const html = md.render(content);
  return res.json({ html });
});
