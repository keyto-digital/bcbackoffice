import { useEffect, useState } from "react";
import {
  ShoppingCart,
  Package,
  FileText,
  Folder,
  Wheat,
} from "lucide-react";

interface CustomUser {
  id?: string;
  username?: string;
  name?: string;
  full_name?: string;
  email?: string;
}

interface DashboardModule {
  title: string;
  description: string;
  icon: React.ElementType;
}

const modules: DashboardModule[] = [
  {
    title: "Procurement",
    description: "Kelola pembelian & supplier",
    icon: ShoppingCart,
  },
  {
    title: "Inventory",
    description: "Kelola stok & barang",
    icon: Package,
  },
  {
    title: "Accounting",
    description: "Pembukuan & laporan",
    icon: FileText,
  },
  {
    title: "Master Data",
    description: "Kelola data utama sistem",
    icon: Folder,
  },
];

function getUserName(): string {
  try {
    const storedUser = localStorage.getItem("custom_user");

    if (!storedUser) {
      return "User";
    }

    const user = JSON.parse(storedUser) as CustomUser;

    return (
      user.name?.trim() ||
      user.full_name?.trim() ||
      user.username?.trim() ||
      user.email?.split("@")[0] ||
      "User"
    );
  } catch {
    return "User";
  }
}

export default function Dashboard() {
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    setUserName(getUserName());
  }, []);

  return (
    <div className="relative min-h-[calc(100vh-0px)] overflow-hidden bg-[#DCEBFA]">
      {/* =========================================================
          BACKGROUND
          Dibuat senada dengan halaman Login:
          #DCEBFA sebagai warna identitas utama,
          putih sebagai penyeimbang.
      ========================================================= */}
      <div className="absolute inset-0 bg-[#DCEBFA]" />

      <div className="absolute -left-32 -top-32 h-[430px] w-[430px] rounded-full bg-white/45" />
      <div className="absolute -bottom-44 -right-32 h-[500px] w-[500px] rounded-full bg-white/35" />

      {/* Foto bakery tetap ada, tetapi dibuat sangat halus */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.13]"
        style={{
          backgroundImage: "url('/bcbground.jpg')",
        }}
      />

      {/* White veil supaya dashboard tetap clean */}
      <div className="absolute inset-0 bg-white/28" />

      {/* CONTENT */}
      <div className="relative z-10 flex min-h-[calc(100vh-0px)] flex-col">
        <main className="flex flex-1 items-center justify-center px-6 py-10 md:px-10 lg:px-16">
          <div className="w-full max-w-6xl">
            {/* =====================================================
                MAIN WELCOME AREA
            ===================================================== */}
            <section className="flex flex-col items-center text-center">
              {/* Logo */}
              <div className="mb-5 rounded-2xl border border-white/75 bg-white/55 px-7 py-4 shadow-sm backdrop-blur-sm">
                <img
                  src="/logo.png"
                  alt="Butter Club Bakery"
                  className="h-auto w-[230px] object-contain md:w-[330px] lg:w-[400px]"
                />
              </div>

              {/* Divider mengikuti Login */}
              <div className="mb-6 flex items-center justify-center gap-4">
                <span className="h-px w-20 bg-[#2877BD]/45 md:w-32" />

                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-red-200/80 bg-white/80 shadow-sm">
                  <Wheat
                    size={18}
                    strokeWidth={1.7}
                    className="text-[#D62828]"
                  />
                </div>

                <span className="h-px w-20 bg-[#2877BD]/45 md:w-32" />
              </div>

              {/* Welcome */}
              <h1 className="text-2xl font-semibold tracking-tight text-[#23415F] md:text-4xl">
                Selamat datang, {userName}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#61778C] md:text-base">
                Kelola bisnis bakery Anda dengan mudah, terstruktur,
                <br className="hidden md:block" />
                dan terintegrasi dalam satu sistem.
              </p>

              {/* Red accent */}
              <div className="mt-6 flex items-center gap-2">
                <span className="h-px w-8 bg-[#D62828]/65" />
                <span className="h-1.5 w-1.5 rounded-full bg-[#D62828]" />
                <span className="h-px w-8 bg-[#D62828]/65" />
              </div>
            </section>

            {/* =====================================================
                MODULE PREVIEW
                Komposisi dibuat seperti Login:
                putih + #DCEBFA + navy + blue + red accent.
            ===================================================== */}
            <section className="mx-auto mt-11 max-w-5xl">
              <div className="overflow-hidden rounded-2xl border border-white/80 bg-white/55 shadow-[0_14px_40px_rgba(35,65,95,0.08)] backdrop-blur-sm">
                <div className="grid grid-cols-2 md:grid-cols-4">
                  {modules.map((module, index) => {
                    const Icon = module.icon;

                    return (
                      <div
                        key={module.title}
                        className={`
                          group flex flex-col items-center px-5 py-7 text-center
                          transition-colors duration-200
                          hover:bg-white/65
                          ${
                            index !== modules.length - 1
                              ? "border-r border-[#DCEBFA]"
                              : ""
                          }
                          ${
                            index < 2
                              ? "border-b border-[#DCEBFA] md:border-b-0"
                              : ""
                          }
                        `}
                      >
                        {/* Icon circle */}
                        <div
                          className="
                            flex h-[72px] w-[72px] items-center justify-center
                            rounded-full
                            border border-[#2877BD]/20
                            bg-white/85
                            shadow-[0_5px_16px_rgba(40,119,189,0.08)]
                            transition-all duration-300
                            group-hover:-translate-y-0.5
                            group-hover:border-[#2877BD]/35
                            group-hover:bg-white
                            group-hover:shadow-[0_8px_20px_rgba(40,119,189,0.13)]
                          "
                        >
                          <Icon
                            size={29}
                            strokeWidth={1.6}
                            className="text-[#2877BD]"
                          />
                        </div>

                        {/* Title */}
                        <h3 className="mt-4 text-base font-semibold text-[#23415F]">
                          {module.title}
                        </h3>

                        {/* Description */}
                        <p className="mt-1 max-w-[150px] text-xs leading-5 text-[#72869A]">
                          {module.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* =====================================================
                QUOTE
            ===================================================== */}
            <section className="mt-10 flex justify-center">
              <div className="flex items-center gap-3 text-center">
                <span className="text-3xl leading-none text-[#D62828]">
                  “
                </span>

                <p className="text-sm italic text-[#23415F] md:text-base">
                  Kualitas adalah resep utama setiap produk kami.
                </p>

                <span className="mt-3 text-3xl leading-none text-[#D62828]">
                  ”
                </span>
              </div>
            </section>
          </div>
        </main>

        {/* =========================================================
            FOOTER
        ========================================================= */}
        <footer className="relative z-10 px-6 pb-6 pt-2 text-center">
          <p className="text-xs text-[#718397]">
            Management System
          </p>

          <p className="mt-1 text-[11px] text-[#9AA9B7]">
            © 2026
          </p>
        </footer>
      </div>
    </div>
  );
}