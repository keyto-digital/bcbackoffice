
import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as backendModule from "../../backend/index.js";

type ExpressHandler = (
  req: VercelRequest,
  res: VercelResponse
) => unknown;

const first = backendModule as unknown as {
  default?: unknown;
};

const second = first.default as {
  default?: unknown;
} | undefined;

const backendApp: ExpressHandler | undefined =
  typeof first.default === "function"
    ? first.default as ExpressHandler
    : typeof second?.default === "function"
      ? second.default as ExpressHandler
      : typeof backendModule === "function"
        ? backendModule as unknown as ExpressHandler
        : undefined;

export default function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (!backendApp) {
    console.error("Backend Express export tidak valid untuk Receiving.");
    return res.status(500).json({
      success: false,
      message: "Backend Express export tidak valid."
    });
  }

  req.url = "/receiving/delete-draft";
  return backendApp(req, res);
}
