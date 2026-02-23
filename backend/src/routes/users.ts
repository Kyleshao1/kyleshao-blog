import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../db";
import { authRequired } from "../middleware/auth";

export const usersRouter = Router();

usersRouter.get("/me", authRequired, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      bio: true,
      signature: true,
      role: true,
      isBanned: true,
      mutedUntil: true,
      createdAt: true,
    },
  });
  return res.json({ user });
});

usersRouter.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { deactivatedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      bio: true,
      signature: true,
      createdAt: true,
      _count: { select: { posts: true, followers: true } },
    },
  });
  return res.json({ users });
});

usersRouter.get("/users/:id", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id, deactivatedAt: null },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      bio: true,
      signature: true,
      createdAt: true,
      groups: { select: { id: true, name: true } },
      _count: { select: { posts: true, followers: true, following: true } },
    },
  });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const posts = await prisma.post.findMany({
    where: { authorId: user.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      group: true,
      reactions: true,
      _count: { select: { comments: true } },
    },
  });

  const comments = await prisma.comment.findMany({
    where: { authorId: user.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      post: { select: { id: true, title: true } },
      reactions: true,
    },
  });

  const postData = posts.map((post) => ({
    id: post.id,
    title: post.title,
    contentMd: post.contentMd,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    group: post.group ? { id: post.group.id, name: post.group.name } : null,
    counts: {
      comments: post._count.comments,
      likes: post.reactions.filter((r) => r.value === 1).length,
      dislikes: post.reactions.filter((r) => r.value === -1).length,
    },
  }));

  const commentData = comments.map((c) => ({
    id: c.id,
    contentMd: c.contentMd,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    post: c.post,
    counts: {
      likes: c.reactions.filter((r) => r.value === 1).length,
      dislikes: c.reactions.filter((r) => r.value === -1).length,
    },
  }));

  return res.json({ user, posts: postData, comments: commentData });
});

usersRouter.post("/users/:id/follow", authRequired, async (req, res) => {
  const targetId = req.params.id;
  if (targetId === req.user!.id) {
    return res.status(400).json({ error: "Cannot follow yourself" });
  }
  const target = await prisma.user.findUnique({ where: { id: targetId, deactivatedAt: null } });
  if (!target) {
    return res.status(404).json({ error: "User not found" });
  }
  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: req.user!.id, followingId: targetId } },
  });
  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    return res.json({ following: false });
  }
  await prisma.follow.create({
    data: { followerId: req.user!.id, followingId: targetId },
  });
  return res.json({ following: true });
});

usersRouter.get("/users/:id/following", authRequired, async (req, res) => {
  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: req.user!.id, followingId: req.params.id } },
  });
  return res.json({ following: Boolean(existing) });
});

const deactivateSchema = z.object({ password: z.string().min(1) });

usersRouter.delete("/me", authRequired, async (req, res) => {
  const parsed = deactivateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user || !user.passwordHash) {
    return res.status(400).json({ error: "Password not set for this account" });
  }
  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) {
    return res.status(403).json({ error: "Invalid password" });
  }
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { deactivatedAt: new Date() },
  });
  return res.json({ ok: true });
});

const groupSchema = z.object({ name: z.string().min(1).max(50) });

usersRouter.get("/groups", authRequired, async (req, res) => {
  const groups = await prisma.postGroup.findMany({
    where: { ownerId: req.user!.id },
    orderBy: { createdAt: "asc" },
  });
  return res.json({ groups });
});

usersRouter.post("/groups", authRequired, async (req, res) => {
  const parsed = groupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }
  const group = await prisma.postGroup.create({
    data: { ownerId: req.user!.id, name: parsed.data.name },
  });
  return res.status(201).json({ group });
});

usersRouter.delete("/groups/:id", authRequired, async (req, res) => {
  const group = await prisma.postGroup.findUnique({ where: { id: req.params.id } });
  if (!group || group.ownerId !== req.user!.id) {
    return res.status(404).json({ error: "Group not found" });
  }
  await prisma.post.updateMany({
    where: { groupId: group.id },
    data: { groupId: null },
  });
  await prisma.postGroup.delete({ where: { id: group.id } });
  return res.json({ ok: true });
});

const profileSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  bio: z.string().max(300).optional(),
  signature: z.string().max(100).optional(),
});

usersRouter.put("/me", authRequired, async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }
  const updated = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      name: parsed.data.name,
      avatarUrl: parsed.data.avatarUrl === "" ? null : parsed.data.avatarUrl,
      bio: parsed.data.bio,
      signature: parsed.data.signature,
    },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      bio: true,
      signature: true,
      role: true,
    },
  });
  return res.json({ user: updated });
});
