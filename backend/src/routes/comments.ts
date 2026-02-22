import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { authOptional, authRequired, ensureNotBanned } from "../middleware/auth";

export const commentsRouter = Router();

commentsRouter.get("/post/:postId", authOptional, async (req, res) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.postId } });
  if (!post || post.deletedAt) {
    return res.status(404).json({ error: "Post not found" });
  }
  const comments = await prisma.comment.findMany({
    where: { postId: post.id, deletedAt: null },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true, signature: true } },
      reactions: true,
    },
  });

  const map = new Map<string, any>();
  const roots: any[] = [];

  for (const c of comments) {
    const likes = c.reactions.filter((r) => r.value === 1).length;
    const dislikes = c.reactions.filter((r) => r.value === -1).length;
    const viewerReaction = req.user
      ? c.reactions.find((r) => r.userId === req.user!.id)?.value || 0
      : 0;
    const item = {
      id: c.id,
      postId: c.postId,
      parentId: c.parentId,
      contentMd: c.contentMd,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      author: c.author,
      counts: { likes, dislikes },
      viewerReaction,
      replies: [],
    };
    map.set(c.id, item);
  }

  for (const item of map.values()) {
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId).replies.push(item);
    } else {
      roots.push(item);
    }
  }

  return res.json({ items: roots });
});

const commentSchema = z.object({
  contentMd: z.string().min(1),
  parentId: z.string().optional().nullable(),
});

commentsRouter.post("/post/:postId", authRequired, ensureNotBanned, async (req, res) => {
  const parsed = commentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }
  const post = await prisma.post.findUnique({ where: { id: req.params.postId } });
  if (!post || post.deletedAt) {
    return res.status(404).json({ error: "Post not found" });
  }
  if (parsed.data.parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: parsed.data.parentId } });
    if (!parent || parent.postId !== post.id || parent.deletedAt) {
      return res.status(400).json({ error: "Invalid parent" });
    }
  }

  const comment = await prisma.comment.create({
    data: {
      postId: post.id,
      authorId: req.user!.id,
      parentId: parsed.data.parentId || null,
      contentMd: parsed.data.contentMd,
    },
  });
  return res.status(201).json({ comment });
});

commentsRouter.put("/:id", authRequired, ensureNotBanned, async (req, res) => {
  const parsed = commentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }
  const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
  if (!comment || comment.deletedAt) {
    return res.status(404).json({ error: "Comment not found" });
  }
  if (comment.authorId !== req.user!.id && req.user!.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden" });
  }
  const updated = await prisma.comment.update({
    where: { id: comment.id },
    data: { contentMd: parsed.data.contentMd },
  });
  return res.json({ comment: updated });
});

commentsRouter.delete("/:id", authRequired, async (req, res) => {
  const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
  if (!comment || comment.deletedAt) {
    return res.status(404).json({ error: "Comment not found" });
  }
  if (comment.authorId !== req.user!.id && req.user!.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden" });
  }
  await prisma.comment.update({
    where: { id: comment.id },
    data: { deletedAt: new Date() },
  });
  return res.json({ ok: true });
});

const reactionSchema = z.object({ value: z.number().int().refine((v) => v === 1 || v === -1) });

commentsRouter.post("/:id/reaction", authRequired, ensureNotBanned, async (req, res) => {
  const parsed = reactionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }
  const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
  if (!comment || comment.deletedAt) {
    return res.status(404).json({ error: "Comment not found" });
  }

  const existing = await prisma.commentReaction.findUnique({
    where: { commentId_userId: { commentId: comment.id, userId: req.user!.id } },
  });

  if (existing) {
    if (existing.value === parsed.data.value) {
      await prisma.commentReaction.delete({ where: { id: existing.id } });
      return res.json({ value: 0 });
    }
    const updated = await prisma.commentReaction.update({
      where: { id: existing.id },
      data: { value: parsed.data.value },
    });
    return res.json({ value: updated.value });
  }

  await prisma.commentReaction.create({
    data: { commentId: comment.id, userId: req.user!.id, value: parsed.data.value },
  });
  return res.json({ value: parsed.data.value });
});

