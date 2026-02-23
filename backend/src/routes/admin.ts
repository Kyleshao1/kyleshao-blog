import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { authRequired } from "../middleware/auth";
import { adminOnly } from "../middleware/admin";

export const adminRouter = Router();

adminRouter.use(authRequired, adminOnly);

adminRouter.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isBanned: true,
      bannedUntil: true,
      mutedUntil: true,
      mutedForever: true,
      deactivatedAt: true,
      createdAt: true,
    },
  });
  return res.json({ users });
});

const moderationSchema = z.object({
  unban: z.boolean().optional(),
  banPermanent: z.boolean().optional(),
  banHours: z.number().int().positive().optional(),
  unmute: z.boolean().optional(),
  mutePermanent: z.boolean().optional(),
  muteHours: z.number().int().positive().optional(),
});

adminRouter.patch("/users/:id", async (req, res) => {
  const parsed = moderationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) {
    return res.status(404).json({ error: "User not found" });
  }
  if (target.role === "ADMIN") {
    return res.status(400).json({ error: "Cannot moderate admin" });
  }

  const data: {
    isBanned?: boolean;
    bannedUntil?: Date | null;
    mutedUntil?: Date | null;
    mutedForever?: boolean;
  } = {};

  if (parsed.data.unban) {
    data.isBanned = false;
    data.bannedUntil = null;
  } else if (parsed.data.banPermanent) {
    data.isBanned = true;
    data.bannedUntil = null;
  } else if (parsed.data.banHours) {
    data.isBanned = false;
    data.bannedUntil = new Date(Date.now() + parsed.data.banHours * 3600 * 1000);
  }

  if (parsed.data.unmute) {
    data.mutedForever = false;
    data.mutedUntil = null;
  } else if (parsed.data.mutePermanent) {
    data.mutedForever = true;
    data.mutedUntil = null;
  } else if (parsed.data.muteHours) {
    data.mutedForever = false;
    data.mutedUntil = new Date(Date.now() + parsed.data.muteHours * 3600 * 1000);
  }

  const updated = await prisma.user.update({
    where: { id: target.id },
    data,
    select: { id: true, isBanned: true, bannedUntil: true, mutedUntil: true, mutedForever: true },
  });
  return res.json({ user: updated });
});

adminRouter.delete("/posts/:id", async (req, res) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post || post.deletedAt) {
    return res.status(404).json({ error: "Post not found" });
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
    prisma.post.delete({ where: { id: post.id } }),
  ]);
  return res.json({ ok: true });
});

adminRouter.delete("/comments/:id", async (req, res) => {
  const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
  if (!comment || comment.deletedAt) {
    return res.status(404).json({ error: "Comment not found" });
  }
  await prisma.comment.update({ where: { id: comment.id }, data: { deletedAt: new Date() } });
  return res.json({ ok: true });
});

adminRouter.patch("/users/:id/deactivate", async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) {
    return res.status(404).json({ error: "User not found" });
  }
  if (target.role === "ADMIN") {
    return res.status(400).json({ error: "Cannot deactivate admin" });
  }
  const updated = await prisma.user.update({
    where: { id: target.id },
    data: { deactivatedAt: target.deactivatedAt ? null : new Date() },
    select: { id: true, deactivatedAt: true },
  });
  return res.json({ user: updated });
});
