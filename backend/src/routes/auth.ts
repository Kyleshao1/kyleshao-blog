import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import passport from "passport";
import { prisma } from "../db.js";
import { signJwt } from "../utils/auth.js";
import { env } from "../env.js";

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
  if (user.deactivatedAt) {
    return res.status(403).json({ error: "Account deactivated" });
  }
  if (user.isBanned) {
    return res.status(403).json({ error: "Account banned" });
  }
  if (user.bannedUntil && user.bannedUntil.getTime() > Date.now()) {
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

authRouter.get("/kydev/callback", async (req, res) => {
  if (!env.KYLEDEV_OAUTH_ISSUER || !env.KYLEDEV_CLIENT_ID || !env.KYLEDEV_CLIENT_SECRET || !env.KYLEDEV_REDIRECT_URI) {
    return res.status(400).json({ error: "Kydev OAuth not configured" });
  }
  const code = String(req.query.code || "");
  if (!code) return res.status(400).json({ error: "Missing code" });

  const tokenResp = await fetch(`${env.KYLEDEV_OAUTH_ISSUER}/api/oauth-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      client_id: env.KYLEDEV_CLIENT_ID,
      client_secret: env.KYLEDEV_CLIENT_SECRET,
      redirect_uri: env.KYLEDEV_REDIRECT_URI
    })
  });
  if (!tokenResp.ok) {
    const err = await tokenResp.text().catch(() => "");
    return res.status(400).json({ error: `OAuth token failed: ${err}` });
  }
  const tokenData = await tokenResp.json();
  const accessToken = tokenData.access_token;
  if (!accessToken) return res.status(400).json({ error: "Missing access_token" });

  const userResp = await fetch(`${env.KYLEDEV_OAUTH_ISSUER}/api/oauth-userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!userResp.ok) {
    const err = await userResp.text().catch(() => "");
    return res.status(400).json({ error: `OAuth userinfo failed: ${err}` });
  }
  const profile = await userResp.json();

  let merged = false;
  let user = await prisma.user.findFirst({ where: { name: profile.username } });
  if (user) {
    merged = true;
  } else {
    user = await prisma.user.findUnique({ where: { email: profile.email } });
  }

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: profile.email,
        name: profile.username || profile.email.split("@")[0],
        role: "USER"
      }
    });
  }

  const token = signJwt(user.id);
  const redirectUrl = new URL(env.FRONTEND_URL + "/oauth");
  redirectUrl.searchParams.set("token", token);
  if (merged) redirectUrl.searchParams.set("merge", "1");
  return res.redirect(redirectUrl.toString());
});
