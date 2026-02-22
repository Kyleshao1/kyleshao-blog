import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import passport from "passport";
import { prisma } from "../db";
import { signJwt } from "../utils/auth";
import { env } from "../env";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(50),
});

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }
  const { email, password, name } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role: env.ADMIN_EMAIL && env.ADMIN_EMAIL === email ? "ADMIN" : "USER",
    },
  });
  const token = signJwt(user.id);
  return res.json({ token });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  if (user.isBanned) {
    return res.status(403).json({ error: "Account banned" });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = signJwt(user.id);
  return res.json({ token });
});

authRouter.get("/github", (req, res, next) => {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return res.status(400).json({ error: "GitHub OAuth not configured" });
  }
  return passport.authenticate("github", { scope: ["user:email"] })(req, res, next);
});

authRouter.get(
  "/github/callback",
  passport.authenticate("github", { session: false, failureRedirect: "/" }),
  async (req, res) => {
    const user = req.user as { id: string };
    const token = signJwt(user.id);
    const redirectUrl = new URL(env.FRONTEND_URL + "/oauth");
    redirectUrl.searchParams.set("token", token);
    return res.redirect(redirectUrl.toString());
  }
);
