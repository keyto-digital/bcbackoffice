
import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as backendModule from "../backend/index.js";

const backendApp = (
  (backendModule as unknown as { default?: unknown }).default ??
  backendModule
) as (req: VercelRequest, res: VercelResponse) => unknown;

export default function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Route Express yang sudah ada adalah POST /login.
  req.url = "/login";
  return backendApp(req, res);
}
