import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import { env } from "./env";
import { prisma } from "./db";
import { authRouter } from "./routes/auth";
import { postsRouter } from "./routes/posts";
import { commentsRouter } from "./routes/comments";
import { usersRouter } from "./routes/users";
import { adminRouter } from "./routes/admin";
import { debugRouter } from "./routes/debug";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));
  app.use(passport.initialize());

  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: env.GITHUB_CLIENT_ID,
          clientSecret: env.GITHUB_CLIENT_SECRET,
          callbackURL: `${env.BACKEND_URL}/api/auth/github/callback`,
        },
        async (accessToken, _refreshToken, profile, done) => {
          try {
            let email = profile.emails?.[0]?.value;
            if (!email) {
              email = await getGithubEmail(accessToken);
            }
            if (!email) {
              return done(new Error("GitHub email not available"));
            }
            let user = await prisma.user.findUnique({ where: { githubId: profile.id } });
            if (!user) {
              const existingByEmail = await prisma.user.findUnique({ where: { email } });
              if (existingByEmail) {
                user = await prisma.user.update({
                  where: { id: existingByEmail.id },
                  data: { githubId: profile.id },
                });
              } else {
                user = await prisma.user.create({
                  data: {
                    email,
                    githubId: profile.id,
                    name: profile.displayName || profile.username || "GitHub User",
                    avatarUrl: profile.photos?.[0]?.value,
                    role: env.ADMIN_EMAIL && env.ADMIN_EMAIL === email ? "ADMIN" : "USER",
                  },
                });
              }
            }
            if (user.deactivatedAt) {
              return done(new Error("Account deactivated"));
            }
            if (user.isBanned) {
              return done(new Error("Account banned"));
            }
            return done(null, { id: user.id });
          } catch (err) {
            return done(err as Error);
          }
        }
      )
    );
  }

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRouter);
  app.use("/api/posts", postsRouter);
  app.use("/api/comments", commentsRouter);
  app.use("/api", usersRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/debug", debugRouter);

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  });

  return app;
}

async function getGithubEmail(accessToken: string) {
  try {
    const res = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    });
    if (!res.ok) return null;
    const emails = (await res.json()) as { email: string; primary: boolean; verified: boolean }[];
    const primary = emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified);
    return primary?.email || null;
  } catch {
    return null;
  }
}
