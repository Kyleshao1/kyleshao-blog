import { Router } from "express";
import MarkdownIt from "markdown-it";
import mk from "markdown-it-katex";

export const renderRouter = Router();

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
}).use(mk);

renderRouter.post("/render", (req, res) => {
  const content = typeof req.body?.content === "string" ? req.body.content : "";
  const html = md.render(content);
  return res.json({ html });
});
