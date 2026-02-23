import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env";
import { prisma } from "../db";

export type AuthUser = {
  id: string;
  role: "USER" | "ADMIN";
  isBanned: boolean;
  bannedUntil: Date | null;
  mutedUntil: Date | null;
  mutedForever: boolean;
  deactivatedAt: Date | null;
};

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

export async function authRequired(req: Request, res: Response, next: NextFunction) {
  const token = getToken(req);
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        role: true,
        isBanned: true,
        bannedUntil: true,
        mutedUntil: true,
        mutedForever: true,
        deactivatedAt: true,
      },
    });
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (user.deactivatedAt) {
      return res.status(403).json({ error: "Account deactivated" });
    }
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

export async function authOptional(req: Request, _res: Response, next: NextFunction) {
  const token = getToken(req);
  if (!token) {
    return next();
  }
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        role: true,
        isBanned: true,
        bannedUntil: true,
        mutedUntil: true,
        mutedForever: true,
        deactivatedAt: true,
      },
    });
    if (user && !user.deactivatedAt) {
      req.user = user;
    }
  } catch {
    // ignore
  }
  return next();
}

export function ensureNotBanned(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (user.isBanned) {
    return res.status(403).json({ error: "Account banned" });
  }
  if (user.bannedUntil && user.bannedUntil.getTime() > Date.now()) {
    return res.status(403).json({ error: "Account banned" });
  }
  if (user.mutedForever) {
    return res.status(403).json({ error: "Account muted" });
  }
  if (user.mutedUntil && user.mutedUntil.getTime() > Date.now()) {
    return res.status(403).json({ error: "Account muted" });
  }
  return next();
}

function getToken(req: Request) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length);
  }
  return null;
}
