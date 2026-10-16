import type { Request, Response } from "express";
import app from "../backend/index";

// Vercel rewrites legacy public endpoints such as /login to /api/login.
// Strip the /api prefix before passing the request to the existing Express routes.
export default function handler(req: Request, res: Response): void {
  const originalUrl = req.url || "/";
  if (originalUrl === "/api") {
    req.url = "/";
  } else if (originalUrl.startsWith("/api/")) {
    req.url = originalUrl.slice(4);
  }
  app(req, res);
}
