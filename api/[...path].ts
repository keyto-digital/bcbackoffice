
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
  const originalUrl = req.url || "/";

  if (originalUrl === "/api") {
    req.url = "/";
  } else if (originalUrl.startsWith("/api/")) {
    req.url = originalUrl.slice(4);
  }

  return backendApp(req, res);
}
