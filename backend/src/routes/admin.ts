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
      mutedUntil: true,
      createdAt: true,
    },
  });
  return res.json({ users });
});

const moderationSchema = z.object({
  isBanned: z.boolean().optional(),
  mutedUntil: z.string().datetime().optional().nullable(),
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

  const data: { isBanned?: boolean; mutedUntil?: Date | null } = {};
  if (parsed.data.isBanned !== undefined) {
    data.isBanned = parsed.data.isBanned;
  }
  if (parsed.data.mutedUntil !== undefined) {
    data.mutedUntil = parsed.data.mutedUntil ? new Date(parsed.data.mutedUntil) : null;
  }

  const updated = await prisma.user.update({
    where: { id: target.id },
    data,
    select: { id: true, isBanned: true, mutedUntil: true },
  });
  return res.json({ user: updated });
});

adminRouter.delete("/posts/:id", async (req, res) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post || post.deletedAt) {
    return res.status(404).json({ error: "Post not found" });
  }
  await prisma.post.update({ where: { id: post.id }, data: { deletedAt: new Date() } });
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
