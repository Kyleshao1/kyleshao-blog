import jwt from "jsonwebtoken";
import { env } from "../env";

export function signJwt(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "7d" });
}
