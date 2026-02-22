import { Router } from "express";
import { z } from "zod";
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

