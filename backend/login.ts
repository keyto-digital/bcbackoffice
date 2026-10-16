import type { Express, Request, Response } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { createCustomToken } from "./authToken";

interface LoginPayload { username?: string; password?: string; }

// Route didaftarkan ke app Express utama; file ini tidak membuat app/server baru.
export function registerLoginRoute(app: Express, supabase: SupabaseClient): void {
  app.post("/login", async (req: Request<{}, {}, LoginPayload>, res: Response) => {
    try {
      const username = req.body?.username?.trim();
      const password = req.body?.password;
      if (!username || !password) return res.status(400).json({ success: false, message: "Username dan password wajib diisi." });

      const { data: user, error } = await supabase.from("custom_users")
        .select("id, name, password, role, access, entity_id, default_store_id, store_access_scope")
        .eq("name", username).maybeSingle();
      if (error) {
        console.error("Custom login lookup failed:", error.message);
        return res.status(500).json({ success: false, message: "Gagal memverifikasi akun." });
      }
      if (!user || typeof user.password !== "string") return res.status(401).json({ success: false, message: "Username atau password salah." });
      if (!(await bcrypt.compare(password, user.password))) return res.status(401).json({ success: false, message: "Username atau password salah." });
      if (!Array.isArray(user.access)) return res.status(403).json({ success: false, message: "Akses akun belum dikonfigurasi." });

      const token = createCustomToken(String(user.id));
      const { password: _passwordHash, ...safeUser } = user;
      return res.json({ success: true, user: safeUser, token });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login gagal.";
      console.error("Custom login error:", message);
      return res.status(500).json({ success: false, message });
    }
  });
}
