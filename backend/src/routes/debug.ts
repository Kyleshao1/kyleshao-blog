import { Router } from "express";
import { prisma } from "../db";

export const debugRouter = Router();

debugRouter.get("/db", async (_req, res) => {
  const rows = await prisma.$queryRaw<
    { db: string; schema: string; user: string; now: Date }[]
  >`SELECT current_database() AS db, current_schema() AS schema, current_user AS user, now() AS now`;

  return res.json({
    db: rows[0]?.db,
    schema: rows[0]?.schema,
    user: rows[0]?.user,
    now: rows[0]?.now,
  });
});
