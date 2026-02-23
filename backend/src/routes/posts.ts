import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { authOptional, authRequired, ensureNotBanned } from "../middleware/auth";

export const postsRouter = Router();

postsRouter.get("/", authOptional, async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize || 10)));
  const search = typeof req.query.search === "string" ? req.query.search : "";

  const where = {
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { contentMd: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  } as const;

  const [items, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        author: { select: { id: true, name: true, avatarUrl: true, signature: true } },
        group: { select: { id: true, name: true } },
        reactions: true,
        _count: { select: { comments: true } },
      },
    }),
    prisma.post.count({ where }),
  ]);

  const data = items.map((post) => {
    const likes = post.reactions.filter((r) => r.value === 1).length;
    const dislikes = post.reactions.filter((r) => r.value === -1).length;
    const viewerReaction = req.user
      ? post.reactions.find((r) => r.userId === req.user!.id)?.value || 0
      : 0;
    return {
      id: post.id,
      title: post.title,
      contentMd: post.contentMd,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: post.author,
      group: post.group,
      counts: { comments: post._count.comments, likes, dislikes },
      viewerReaction,
    };
  });

  return res.json({ items: data, total, page, pageSize });
});

postsRouter.get("/:id", authOptional, async (req, res) => {
  const post = await prisma.post.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true, signature: true } },
      group: { select: { id: true, name: true } },
      reactions: true,
      _count: { select: { comments: true } },
    },
  });
  if (!post) {
    return res.status(404).json({ error: "Post not found" });
  }
  const likes = post.reactions.filter((r) => r.value === 1).length;
  const dislikes = post.reactions.filter((r) => r.value === -1).length;
  const viewerReaction = req.user
    ? post.reactions.find((r) => r.userId === req.user!.id)?.value || 0
    : 0;

  return res.json({
    post: {
      id: post.id,
      title: post.title,
      contentMd: post.contentMd,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: post.author,
      group: post.group,
      counts: { comments: post._count.comments, likes, dislikes },
      viewerReaction,
    },
  });
});

const postSchema = z.object({
  title: z.string().min(1).max(120),
  contentMd: z.string().min(1),
  groupId: z.string().optional().nullable(),
});

postsRouter.post("/", authRequired, ensureNotBanned, async (req, res) => {
  const parsed = postSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }
  if (parsed.data.groupId) {
    const group = await prisma.postGroup.findUnique({ where: { id: parsed.data.groupId } });
    if (!group || group.ownerId !== req.user!.id) {
      return res.status(400).json({ error: "Invalid group" });
    }
  }
  const post = await prisma.post.create({
    data: {
      authorId: req.user!.id,
      title: parsed.data.title,
      contentMd: parsed.data.contentMd,
      groupId: parsed.data.groupId || null,
    },
  });
  return res.status(201).json({ post });
});

postsRouter.put("/:id", authRequired, ensureNotBanned, async (req, res) => {
  const parsed = postSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post || post.deletedAt) {
    return res.status(404).json({ error: "Post not found" });
  }
  if (post.authorId !== req.user!.id && req.user!.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden" });
  }
  let groupId = parsed.data.groupId || null;
  if (groupId) {
    const group = await prisma.postGroup.findUnique({ where: { id: groupId } });
    if (!group || group.ownerId !== post.authorId) {
      return res.status(400).json({ error: "Invalid group" });
    }
  }

  const updated = await prisma.post.update({
    where: { id: post.id },
    data: { title: parsed.data.title, contentMd: parsed.data.contentMd, groupId },
  });
  return res.json({ post: updated });
});

postsRouter.delete("/:id", authRequired, async (req, res) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post || post.deletedAt) {
    return res.status(404).json({ error: "Post not found" });
  }
  if (post.authorId !== req.user!.id && req.user!.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden" });
  }
  const commentIds = await prisma.comment.findMany({
    where: { postId: post.id },
    select: { id: true },
  });
  const ids = commentIds.map((c) => c.id);

  await prisma.$transaction([
    prisma.commentReaction.deleteMany({ where: { commentId: { in: ids } } }),
    prisma.comment.deleteMany({ where: { postId: post.id } }),
    prisma.postReaction.deleteMany({ where: { postId: post.id } }),
    prisma.post.update({
      where: { id: post.id },
      data: { deletedAt: new Date() },
    }),
  ]);
  return res.json({ ok: true });
});

const reactionSchema = z.object({ value: z.number().int().refine((v) => v === 1 || v === -1) });

postsRouter.post("/:id/reaction", authRequired, ensureNotBanned, async (req, res) => {
  const parsed = reactionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post || post.deletedAt) {
    return res.status(404).json({ error: "Post not found" });
  }

  const existing = await prisma.postReaction.findUnique({
    where: { postId_userId: { postId: post.id, userId: req.user!.id } },
  });

  if (existing) {
    if (existing.value === parsed.data.value) {
      await prisma.postReaction.delete({ where: { id: existing.id } });
      return res.json({ value: 0 });
    }
    const updated = await prisma.postReaction.update({
      where: { id: existing.id },
      data: { value: parsed.data.value },
    });
    return res.json({ value: updated.value });
  }

  await prisma.postReaction.create({
    data: { postId: post.id, userId: req.user!.id, value: parsed.data.value },
  });
  return res.json({ value: parsed.data.value });
});
