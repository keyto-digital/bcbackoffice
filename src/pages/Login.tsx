import { useEffect, useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { authenticateUser } from "../lib/authUser";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const originalBodyBg = document.body.style.backgroundColor;
    const originalHtmlBg = document.documentElement.style.backgroundColor;
    const originalBodyMargin = document.body.style.margin;
    const originalHtmlMargin = document.documentElement.style.margin;

    document.body.style.backgroundColor = "#DCEBFA";
    document.documentElement.style.backgroundColor = "#DCEBFA";
    document.body.style.margin = "0";
    document.documentElement.style.margin = "0";

    return () => {
      document.body.style.backgroundColor = originalBodyBg;
      document.documentElement.style.backgroundColor = originalHtmlBg;
      document.body.style.margin = originalBodyMargin;
      document.documentElement.style.margin = originalHtmlMargin;
    };
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await authenticateUser(username, password);

      if (!user || !Array.isArray(user.access) || user.access.length === 0) {
        alert("Login gagal: akses tidak ditemukan.");
        return;
      }

      localStorage.setItem("custom_user", JSON.stringify(user));
      console.log("✅ custom_user tersimpan:", user);

      if (!user?.id || user.id.includes("-")) {
        console.warn("⚠️ ID user masih UUID atau tidak valid:", user.id);
        alert(
          "Login berhasil, tapi ID user tidak valid. Pastikan login pakai custom_users."
        );
      }

      window.location.href = "/dashboard";
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat login.";

      alert("Login gagal: " + message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .login-page {
          min-height: 100vh;
          width: 100%;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px;
          background:
            radial-gradient(circle at 12% 18%, rgba(255,255,255,0.82), transparent 28%),
            radial-gradient(circle at 88% 82%, rgba(255,255,255,0.68), transparent 30%),
            #DCEBFA;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .login-shell {
          width: min(1120px, 100%);
          min-height: 650px;
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(380px, 0.85fr);
          overflow: hidden;
          background: #ffffff;
          border: 1px solid rgba(255,255,255,0.95);
          border-radius: 24px;
          box-shadow:
            0 24px 70px rgba(35, 65, 95, 0.16),
            0 5px 18px rgba(35, 65, 95, 0.08);
        }

        .shop-panel {
          position: relative;
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 44px 42px 38px;
          overflow: hidden;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.38), rgba(220,235,250,0.12)),
            #DCEBFA;
          border-right: 1px solid #e6eef6;
        }

        .shop-panel::before {
          content: "";
          position: absolute;
          width: 330px;
          height: 330px;
          border-radius: 50%;
          background: rgba(255,255,255,0.45);
          top: -150px;
          left: -120px;
        }

        .shop-panel::after {
          content: "";
          position: absolute;
          width: 280px;
          height: 280px;
          border-radius: 50%;
          background: rgba(255,255,255,0.28);
          bottom: -145px;
          right: -110px;
        }

        .brand-pill {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 13px;
          border: 1px solid rgba(40,119,189,0.18);
          border-radius: 999px;
          background: rgba(255,255,255,0.7);
          color: #23415F;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          box-shadow: 0 5px 18px rgba(35,65,95,0.06);
        }

        .brand-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #D62828;
          box-shadow: 0 0 0 4px rgba(214,40,40,0.08);
        }

        .shop-image-wrap {
          position: relative;
          z-index: 1;
          width: min(100%, 700px);
          margin: 24px auto 10px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .shop-image {
          display: block;
          width: 100%;
          max-width: 680px;
          height: auto;
          object-fit: contain;
          filter: drop-shadow(0 16px 18px rgba(35,65,95,0.12));
        }

        .shop-title {
          position: relative;
          z-index: 1;
          margin: 8px 0 0;
          color: #23415F;
          font-size: clamp(24px, 3vw, 34px);
          line-height: 1.15;
          font-weight: 750;
          letter-spacing: -0.03em;
          text-align: center;
        }

        .shop-subtitle {
          position: relative;
          z-index: 1;
          max-width: 520px;
          margin: 10px 0 0;
          color: #5f7489;
          font-size: 13px;
          line-height: 1.7;
          text-align: center;
        }

        .red-accent {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 7px;
          margin-top: 20px;
        }

        .red-accent-line {
          width: 34px;
          height: 1px;
          background: #d62828;
          opacity: 0.65;
        }

        .red-accent-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #d62828;
        }

        .form-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 48px 42px;
          background: #ffffff;
        }

        .form-inner {
          width: 100%;
          max-width: 360px;
        }

        .login-logo {
          display: block;
          width: 190px;
          height: auto;
          max-height: 76px;
          object-fit: contain;
          margin: 0 auto 25px;
        }

        .welcome-eyebrow {
          margin: 0 0 8px;
          color: #2877BD;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          text-align: center;
        }

        .login-heading {
          margin: 0;
          color: #23415F;
          font-size: 29px;
          line-height: 1.2;
          font-weight: 750;
          letter-spacing: -0.035em;
          text-align: center;
        }

        .login-description {
          margin: 9px auto 30px;
          max-width: 300px;
          color: #718397;
          font-size: 13px;
          line-height: 1.65;
          text-align: center;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 17px;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .field-label {
          color: #36516b;
          font-size: 12px;
          font-weight: 700;
        }

        .field-wrap {
          position: relative;
        }

        .field-icon {
          position: absolute;
          left: 15px;
          top: 50%;
          transform: translateY(-50%);
          color: #7f9ab2;
          pointer-events: none;
        }

        .field-input {
          width: 100%;
          height: 48px;
          box-sizing: border-box;
          padding: 0 44px;
          border: 1px solid #d7e3ee;
          border-radius: 11px;
          outline: none;
          background: #fbfdff;
          color: #23415F;
          font-size: 13px;
          transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
        }

        .field-input::placeholder {
          color: #a4b3c1;
        }

        .field-input:focus {
          border-color: #2877BD;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(40,119,189,0.11);
        }

        .password-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 0;
          background: transparent;
          color: #7f9ab2;
          cursor: pointer;
          border-radius: 7px;
        }

        .password-toggle:hover {
          color: #2877BD;
          background: #eef6fd;
        }

        .login-button {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          width: 100%;
          height: 49px;
          margin-top: 5px;
          border: 0;
          border-radius: 11px;
          background: #2877BD;
          color: #ffffff;
          font-size: 13px;
          font-weight: 750;
          letter-spacing: 0.01em;
          cursor: pointer;
          box-shadow: 0 8px 18px rgba(40,119,189,0.22);
          transition: transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
        }

        .login-button:hover:not(:disabled) {
          background: #23415F;
          transform: translateY(-1px);
          box-shadow: 0 11px 22px rgba(35,65,95,0.22);
        }

        .login-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-button:disabled {
          background: #9bb9d2;
          cursor: not-allowed;
          box-shadow: none;
        }

        .login-button::before {
          content: "";
          position: absolute;
          left: 12px;
          right: 12px;
          top: 4px;
          height: 1px;
          background: rgba(255,255,255,0.35);
          border-radius: 999px;
        }

        .security-note {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          margin-top: 21px;
          color: #8293a4;
          font-size: 10.5px;
        }

        .security-note svg {
          color: #2877BD;
        }

        .login-footer {
          margin-top: 34px;
          padding-top: 17px;
          border-top: 1px solid #edf2f6;
          color: #9aa8b5;
          font-size: 10.5px;
          line-height: 1.6;
          text-align: center;
        }

        .login-footer strong {
          color: #667d92;
          font-weight: 700;
        }

        @media (max-width: 900px) {
          .login-page {
            padding: 22px;
          }

          .login-shell {
            grid-template-columns: 1fr;
            max-width: 560px;
            min-height: auto;
          }

          .shop-panel {
            min-height: 350px;
            padding: 30px 28px 25px;
            border-right: 0;
            border-bottom: 1px solid #e6eef6;
          }

          .shop-image-wrap {
            margin: 16px auto 2px;
          }

          .shop-image {
            max-width: 500px;
          }

          .shop-title {
            font-size: 25px;
          }

          .shop-subtitle {
            display: none;
          }

          .form-panel {
            padding: 38px 34px 34px;
          }
        }

        @media (max-width: 520px) {
          .login-page {
            padding: 0;
          }

          .login-shell {
            min-height: 100vh;
            border: 0;
            border-radius: 0;
            box-shadow: none;
          }

          .shop-panel {
            min-height: 270px;
            padding: 24px 20px 20px;
          }

          .brand-pill {
            font-size: 9px;
          }

          .shop-image-wrap {
            margin-top: 10px;
          }

          .shop-title {
            font-size: 22px;
          }

          .form-panel {
            padding: 32px 25px 28px;
          }

          .login-logo {
            width: 165px;
            margin-bottom: 20px;
          }

          .login-heading {
            font-size: 26px;
          }
        }
      `}</style>

      <div className="login-page">
        <div className="login-shell">
          <section className="shop-panel">
            <div className="brand-pill">
              <span className="brand-dot" />
              Management System
            </div>

            <div className="shop-image-wrap">
              <img
                src="/shop.webp"
                alt="Butter Club Bakery storefront"
                className="shop-image"
              />
            </div>

            <p className="shop-subtitle">
              Operasional bisnis yang lebih terstruktur dan terintegrasi.
            </p>

            <div className="red-accent" aria-hidden="true">
              <span className="red-accent-line" />
              <span className="red-accent-dot" />
              <span className="red-accent-line" />
            </div>
          </section>

          <section className="form-panel">
            <div className="form-inner">
              <img
                src="/logo.png"
                alt="Butter Club Bakery"
                className="login-logo"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />

              <p className="welcome-eyebrow"></p>

              <h2 className="login-heading">Selamat Datang</h2>

              <p className="login-description">
                Masuk untuk melanjutkan ke dashboard Butter Club Bakery.
              </p>

              <form onSubmit={handleLogin} className="login-form">
                <div className="field-group">
                  <label htmlFor="username" className="field-label">
                    Username
                  </label>

                  <div className="field-wrap">
                    <UserRound
                      className="field-icon"
                      size={17}
                      strokeWidth={1.8}
                    />

                    <input
                      id="username"
                      type="text"
                      placeholder="Masukkan username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      required
                      className="field-input"
                    />
                  </div>
                </div>

                <div className="field-group">
                  <label htmlFor="password" className="field-label">
                    Password
                  </label>

                  <div className="field-wrap">
                    <LockKeyhole
                      className="field-icon"
                      size={17}
                      strokeWidth={1.8}
                    />

                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Masukkan password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                      className="field-input"
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={
                        showPassword
                          ? "Sembunyikan password"
                          : "Tampilkan password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff size={17} strokeWidth={1.8} />
                      ) : (
                        <Eye size={17} strokeWidth={1.8} />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="login-button"
                >
                  <span>{loading ? "Memproses..." : "Masuk ke Dashboard"}</span>
                  {!loading && <ArrowRight size={17} strokeWidth={2} />}
                </button>
              </form>

              <div className="security-note">
                <ShieldCheck size={14} strokeWidth={1.8} />
                <span>Akses sistem terlindungi dan aman</span>
              </div>

              <div className="login-footer">
                <strong>Internal Control Management System</strong>
                <br />
                © 2026 · All rights reserved
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}