import { useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Loader2,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { getCustomUser } from "@/lib/authUser";
import { supabase } from "@/lib/supabaseClient";

import { useMisMacro } from "./useMisMacro";
import { useMisBalanceSheet } from "./useMisBalanceSheet";
import type { MisMacroRow } from "./types";
import { useMisBsDetail } from "./useMisBsDetail";

const MONTHS = [
  {
    value: 1,
    label: "Jan",
    key: "jan",
  },
  {
    value: 2,
    label: "Feb",
    key: "feb",
  },
  {
    value: 3,
    label: "Mar",
    key: "mar",
  },
  {
    value: 4,
    label: "Apr",
    key: "apr",
  },
  {
    value: 5,
    label: "Mei",
    key: "may",
  },
  {
    value: 6,
    label: "Jun",
    key: "jun",
  },
  {
    value: 7,
    label: "Jul",
    key: "jul",
  },
  {
    value: 8,
    label: "Agu",
    key: "aug",
  },
  {
    value: 9,
    label: "Sep",
    key: "sep",
  },
  {
    value: 10,
    label: "Okt",
    key: "oct",
  },
  {
    value: 11,
    label: "Nov",
    key: "nov",
  },
  {
    value: 12,
    label: "Des",
    key: "december",
  },
] as const;

const CATEGORIES = [
  "REVENUE",
  "OTHER_INCOME",
  "COGS",
  "EXPENSE",
  "OTHER_EXPENSE",
];

const CATEGORY_LABELS: Record<
  string,
  string
> = {
  REVENUE: "Revenue",
  OTHER_INCOME: "Other Income",
  COGS: "COGS",
  EXPENSE: "Expense",
  OTHER_EXPENSE: "Other Expense",
};

const GRID_COLUMNS =
  "95px 270px 90px repeat(12, 115px) 125px 125px 125px 125px 125px 125px 125px";

function formatNumber(value: number) {
  return new Intl.NumberFormat(
    "id-ID",
    {
      maximumFractionDigits: 0,
    },
  ).format(value || 0);
}

function formatCompact(value: number) {
  const absolute = Math.abs(value);

  if (absolute >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)} B`;
  }

  if (absolute >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)} M`;
  }

  if (absolute >= 1_000) {
    return `${(value / 1_000).toFixed(1)} K`;
  }

  return formatNumber(value);
}

function getMonthValue(
  row: MisMacroRow,
  monthKey:
    | "jan"
    | "feb"
    | "mar"
    | "apr"
    | "may"
    | "jun"
    | "jul"
    | "aug"
    | "sep"
    | "oct"
    | "nov"
    | "december",
) {
  return Number(row[monthKey] ?? 0);
}

function getVariance(
  actual: number,
  budget: number,
) {
  return actual - budget;
}

function getVariancePercent(
  actual: number,
  budget: number,
) {
  if (!budget) {
    return null;
  }

  return (
    ((actual - budget) /
      Math.abs(budget)) *
    100
  );
}

function getMisSign(
  categoryCode: string,
) {
  if (
    categoryCode === "REVENUE" ||
    categoryCode === "OTHER_INCOME"
  ) {
    return 1;
  }

  if (
    categoryCode === "COGS" ||
    categoryCode === "EXPENSE" ||
    categoryCode === "OTHER_EXPENSE"
  ) {
    return -1;
  }

  return 0;
}

function getMisNetValue(
  rows: MisMacroRow[],
  field:
    | "last_month"
    | "actual"
    | "budget"
    | "last_year"
    | "ytd"
    | "ytd_budget"
    | "last_year_ytd",
) {
  return rows.reduce(
    (total, row) =>
      total +
      getMisSign(row.category_code) *
        Number(row[field] ?? 0),
    0,
  );
}

export default function MisMacroPage() {
  const currentYear =
    new Date().getFullYear();

  const currentMonth =
    new Date().getMonth() + 1;

  const currentUser =
    getCustomUser();

  const entityId =
    currentUser?.entity_id ?? null;

  const [year, setYear] =
    useState(currentYear);

  const [month, setMonth] =
    useState(currentMonth);

  const [exporting, setExporting] =
  useState(false);

  const [exportError, setExportError] =
    useState<string | null>(null);

  const coaCacheRef = useRef<
    {
      code: string;
      name: string;
      category_code: string;
      normal_balance: string;
      is_active: boolean;
      is_posting: boolean;
    }[] | null
  >(null);

  const [search, setSearch] =
    useState("");

  const [division, setDivision] =
    useState("ALL");

  const [category, setCategory] =
    useState("ALL");

  const [openCategories, setOpenCategories] =
    useState<Record<string, boolean>>({
      REVENUE: true,
      OTHER_INCOME: true,
      COGS: true,
      EXPENSE: true,
      OTHER_EXPENSE: true,
    });

  const balanceSheetAsOfDate =
    year && month
      ? `${year}-${String(month).padStart(2, "0")}-${String(
          new Date(year, month, 0).getDate(),
        ).padStart(2, "0")}`
      : null;

  const {
    rows: balanceSheetRows,
  } = useMisBalanceSheet({
    entityId,
    asOfDate: balanceSheetAsOfDate,
  });

  const {
    rows,
    loading,
    error,
    reload,
  } = useMisMacro(
    entityId,
    year,
    month,
  );

  const {
    rows: bsDetailRows,
  } = useMisBsDetail(
    entityId,
    year,
    month,
  );

  const handleExportMis = async () => {
    if (!entityId || exporting) {
      return;
    }

    setExporting(true);
    setExportError(null);

    try {
      /*
      * COA harus diambil ulang saat tombol Export ditekan.
      *
      * Jangan bergantung pada state hook useCoa di halaman karena
      * export bisa terjadi sebelum fetch async tersebut selesai.
      * Query dibatasi ke entity aktif agar akun entity lain tidak ikut.
      */
      let coaRows = coaCacheRef.current;

        if (!coaRows) {
          const {
            data: coaData,
            error: coaError,
          } = await supabase
            .from("accounts")
            .select(
              "code, name, category_code, normal_balance, is_active, is_posting",
            )
            .order("code", {
              ascending: true,
            });

          if (coaError) {
            throw new Error(
              `Gagal mengambil COA: ${coaError.message}`,
            );
          }

          coaRows = (coaData ?? []).map(
            (account) => ({
              code: account.code,
              name: account.name,
              category_code: account.category_code,
              normal_balance: account.normal_balance,
              is_active: account.is_active,
              is_posting: account.is_posting,
            }),
          );

          coaCacheRef.current = coaRows;
        }

      const { downloadMisWorkbook } = await import(
        "../utils/generateMisWorkbook"
      );

      downloadMisWorkbook({
        entityId,
        year,
        month,
        macroRows: rows,
        bsDetailRows,
        balanceSheetRows,
        coaRows,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Gagal membuat export MIS.";

      console.error(
        "[MIS Export] gagal:",
        error,
      );

      setExportError(message);
    } finally {
      setExporting(false);
    }
  };

  /* ======================================================
     DIVISIONS
  ====================================================== */

  const divisions = useMemo(() => {
    const values = new Set<string>();

    rows.forEach((row) => {
      if (row.division_code) {
        values.add(
          row.division_code,
        );
      }
    });

    return Array.from(values).sort();
  }, [rows]);

  /* ======================================================
     FILTER
  ====================================================== */

  const filteredRows = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !keyword ||
        row.account_code
          .toLowerCase()
          .includes(keyword) ||
        row.account_name
          .toLowerCase()
          .includes(keyword);

      const matchesDivision =
        division === "ALL" ||
        row.division_code ===
          division;

      const matchesCategory =
        category === "ALL" ||
        row.category_code ===
          category;

      return (
        matchesSearch &&
        matchesDivision &&
        matchesCategory
      );
    });
  }, [
    rows,
    search,
    division,
    category,
  ]);

  /* ======================================================
     GROUP
  ====================================================== */

  const groupedRows = useMemo(() => {
    const groups: Record<
      string,
      MisMacroRow[]
    > = {};

    for (const code of CATEGORIES) {
      groups[code] = [];
    }

    for (const row of filteredRows) {
      if (!groups[row.category_code]) {
        groups[row.category_code] =
          [];
      }

      groups[row.category_code].push(
        row,
      );
    }

    return groups;
  }, [filteredRows]);

  /* ======================================================
     SUMMARY
  ====================================================== */

  const summary = useMemo(() => {
    return {
      actual: getMisNetValue(
        rows,
        "actual",
      ),

      budget: getMisNetValue(
        rows,
        "budget",
      ),

      ytd: getMisNetValue(
        rows,
        "ytd",
      ),

      ytdBudget: getMisNetValue(
        rows,
        "ytd_budget",
      ),

      lastYear: getMisNetValue(
        rows,
        "last_year",
      ),

      lastYearYtd: getMisNetValue(
        rows,
        "last_year_ytd",
      ),
    };
  }, [rows]);

  /* ======================================================
     CATEGORY TOGGLE
  ====================================================== */

  const toggleCategory = (
    code: string,
  ) => {
    setOpenCategories(
      (current) => ({
        ...current,
        [code]: !current[code],
      }),
    );
  };

  /* ======================================================
     ENTITY CHECK
  ====================================================== */

  if (!entityId) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-3">
            <CircleAlert className="h-5 w-5 text-amber-600" />

            <div>
              <div className="font-semibold text-amber-900">
                Entity belum tersedia
              </div>

              <div className="mt-1 text-sm text-amber-700">
                User belum memiliki
                entity_id sehingga MACRO
                MIS belum dapat dimuat.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ======================================================
     PAGE
  ====================================================== */

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-[1900px] space-y-5">

        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <CalendarDays className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-xl font-bold text-slate-800">
                SUMMARY MONTHLY INCOME STATEMENT
              </h1>

              <p className="text-sm text-slate-500">
                Consolidated monthly management
                reporting.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">

            {/* YEAR */}
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <span className="text-xs font-medium text-slate-500">
                Tahun
              </span>

              <select
                value={year}
                onChange={(event) =>
                  setYear(
                    Number(
                      event.target.value,
                    ),
                  )
                }
                className="bg-transparent text-sm font-semibold text-slate-800 outline-none"
              >
                {Array.from(
                  { length: 5 },
                  (_, index) =>
                    currentYear - 2 + index,
                ).map((value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {value}
                  </option>
                ))}
              </select>
            </div>

            {/* MONTH */}
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <span className="text-xs font-medium text-slate-500">
                Periode
              </span>

              <select
                value={month}
                onChange={(event) =>
                  setMonth(
                    Number(
                      event.target.value,
                    ),
                  )
                }
                className="bg-transparent text-sm font-semibold text-slate-800 outline-none"
              >
                {MONTHS.map(
                  (item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </option>
                  ),
                )}
              </select>
            </div>

            {/* EXPORT */}
            <button
              type="button"
              onClick={handleExportMis}
              disabled={
                loading ||
                exporting ||
                bsDetailRows.length === 0
              }
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exporting
                ? "Menyiapkan Excel..."
                : "Export Excel"}
            </button>

            {/* REFRESH */}
            <button
              type="button"
              onClick={() => void reload()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={
                  loading
                    ? "h-4 w-4 animate-spin"
                    : "h-4 w-4"
                }
              />

              Refresh
            </button>
          </div>
        </div>

        {/* ==================================================
            SUMMARY CARDS
        ================================================== */}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">

          {/* ACTUAL */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Actual
            </div>

            <div className="mt-2 text-xl font-bold text-slate-800">
              Rp{" "}
              {formatCompact(
                summary.actual,
              )}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Periode{" "}
              {
                MONTHS.find(
                  (item) =>
                    item.value ===
                    month,
                )?.label
              }{" "}
              {year}
            </div>
          </div>

          {/* BUDGET */}
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-blue-500">
              Budget
            </div>

            <div className="mt-2 text-xl font-bold text-blue-800">
              Rp{" "}
              {formatCompact(
                summary.budget,
              )}
            </div>

            <div className="mt-1 text-xs text-blue-600">
              Budget periode berjalan
            </div>
          </div>

          {/* YTD */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
              YTD Actual
            </div>

            <div className="mt-2 text-xl font-bold text-slate-800">
              Rp{" "}
              {formatCompact(
                summary.ytd,
              )}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Januari sampai periode
              berjalan
            </div>
          </div>

          {/* LAST YEAR */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Last Year
            </div>

            <div className="mt-2 text-xl font-bold text-slate-800">
              Rp{" "}
              {formatCompact(
                summary.lastYear,
              )}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Periode yang sama tahun
              sebelumnya
            </div>
          </div>
        </div>

        {/* ==================================================
            FILTER
        ================================================== */}

        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">

            {/* SEARCH */}
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Cari kode atau nama akun..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* DIVISION */}
            <select
              value={division}
              onChange={(event) =>
                setDivision(
                  event.target.value,
                )
              }
              className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="ALL">
                Semua Division
              </option>

              {divisions.map(
                (code) => (
                  <option
                    key={code}
                    value={code}
                  >
                    {code}
                  </option>
                ),
              )}
            </select>

            {/* CATEGORY */}
            <select
              value={category}
              onChange={(event) =>
                setCategory(
                  event.target.value,
                )
              }
              className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="ALL">
                Semua Kategori
              </option>

              {CATEGORIES.map(
                (code) => (
                  <option
                    key={code}
                    value={code}
                  >
                    {CATEGORY_LABELS[
                      code
                    ] ?? code}
                  </option>
                ),
              )}
            </select>

            <div className="whitespace-nowrap text-xs text-slate-400">
              Menampilkan{" "}
              <span className="font-semibold text-slate-600">
                {filteredRows.length}
              </span>{" "}
              dari {rows.length} akun
            </div>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <CircleAlert className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {exportError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <CircleAlert className="h-4 w-4 shrink-0" />
            {exportError}
          </div>
        )}

        {/* ==================================================
            LOADING
        ================================================== */}

        {loading ? (
          <div className="flex min-h-[350px] items-center justify-center rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Memuat MACRO MIS...
            </div>
          </div>
        ) : (
          /* =================================================
             MACRO GRID
          ================================================= */
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

            <div className="overflow-x-auto">

              <div
                className="min-w-[2585px]"
              >

                {/* ==========================================
                    HEADER
                ========================================== */}

                <div
                  className="grid border-b border-slate-200 bg-slate-100"
                  style={{
                    gridTemplateColumns:
                      GRID_COLUMNS,
                  }}
                >
                  <div className="sticky left-0 z-20 border-r border-slate-200 bg-slate-100 px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Kode
                  </div>

                  <div className="sticky left-[95px] z-20 border-r border-slate-200 bg-slate-100 px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Account Name
                  </div>

                  <div className="border-r border-slate-200 bg-slate-100 px-2 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                    Div
                  </div>

                  {MONTHS.map(
                    (item) => (
                      <div
                        key={item.value}
                        className="border-r border-slate-200 bg-slate-100 px-2 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500"
                      >
                        {item.label}
                      </div>
                    ),
                  )}

                  <div className="border-r border-slate-200 bg-blue-50 px-2 py-3 text-center text-xs font-bold uppercase tracking-wide text-blue-700">
                    Last Month
                  </div>

                  <div className="border-r border-slate-200 bg-blue-50 px-2 py-3 text-center text-xs font-bold uppercase tracking-wide text-blue-700">
                    Actual
                  </div>

                  <div className="border-r border-slate-200 bg-amber-50 px-2 py-3 text-center text-xs font-bold uppercase tracking-wide text-amber-700">
                    Budget
                  </div>

                  <div className="border-r border-slate-200 bg-slate-100 px-2 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
                    Last Year
                  </div>

                  <div className="border-r border-slate-200 bg-blue-50 px-2 py-3 text-center text-xs font-bold uppercase tracking-wide text-blue-700">
                    YTD
                  </div>

                  <div className="border-r border-slate-200 bg-amber-50 px-2 py-3 text-center text-xs font-bold uppercase tracking-wide text-amber-700">
                    YTD Budget
                  </div>

                  <div className="bg-slate-100 px-2 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
                    LY YTD
                  </div>
                </div>

                {/* ==========================================
                    GROUPS
                ========================================== */}

                {CATEGORIES.map(
                  (categoryCode) => {
                    const categoryRows =
                      groupedRows[
                        categoryCode
                      ] ?? [];

                    if (
                      categoryRows.length ===
                      0
                    ) {
                      return null;
                    }

                    const isOpen =
                      openCategories[
                        categoryCode
                      ] ?? true;

                    return (
                      <div
                        key={categoryCode}
                      >

                        {/* CATEGORY */}
                        <div
                          className="grid border-b border-slate-200 bg-slate-50"
                          style={{
                            gridTemplateColumns:
                              GRID_COLUMNS,
                          }}
                        >
                          <div
                            className="sticky left-0 z-10 bg-slate-50 px-3 py-2"
                            style={{
                              gridColumn:
                                "1 / span 3",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                toggleCategory(
                                  categoryCode,
                                )
                              }
                              className="flex items-center gap-2"
                            >
                              {isOpen ? (
                                <ChevronDown className="h-4 w-4 text-slate-500" />
                              ) : (
                                <ChevronUp className="h-4 w-4 text-slate-500" />
                              )}

                              <span className="font-bold text-slate-700">
                                {CATEGORY_LABELS[
                                  categoryCode
                                ] ??
                                  categoryCode}
                              </span>

                              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                                {
                                  categoryRows.length
                                }{" "}
                                akun
                              </span>
                            </button>
                          </div>

                          <div
                            className="px-3 py-2 text-right text-xs text-slate-500"
                            style={{
                              gridColumn:
                                "4 / span 20",
                            }}
                          >
                            Consolidated
                            account
                            detail
                          </div>
                        </div>

                        {/* ACCOUNT ROWS */}
                        {isOpen &&
                          categoryRows.map(
                            (row) => {
                              const variance =
                                getVariance(
                                  row.actual,
                                  row.budget,
                                );

                              const variancePercent =
                                getVariancePercent(
                                  row.actual,
                                  row.budget,
                                );

                              return (
                                <div
                                  key={`${categoryCode}-${row.account_id}`}
                                  className="grid border-b border-slate-100 hover:bg-blue-50/30"
                                  style={{
                                    gridTemplateColumns:
                                      GRID_COLUMNS,
                                  }}
                                >

                                  {/* CODE */}
                                  <div className="sticky left-0 z-10 border-r border-slate-100 bg-white px-3 py-2">
                                    <span className="font-mono text-xs font-semibold text-slate-600">
                                      {
                                        row.account_code
                                      }
                                    </span>
                                  </div>

                                  {/* NAME */}
                                  <div className="sticky left-[95px] z-10 border-r border-slate-100 bg-white px-3 py-2">
                                    <div
                                      className="truncate text-xs font-medium text-slate-700"
                                      title={
                                        row.account_name
                                      }
                                    >
                                      {
                                        row.account_name
                                      }
                                    </div>
                                  </div>

                                  {/* DIVISION */}
                                  <div className="border-r border-slate-100 bg-white px-2 py-2 text-center">
                                    <span
                                      className={`inline-flex rounded-md px-2 py-1 text-[10px] font-bold ${
                                        row.division_code ===
                                        "CORP"
                                          ? "bg-slate-100 text-slate-500"
                                          : "bg-blue-50 text-blue-600"
                                      }`}
                                    >
                                      {
                                        row.division_code
                                      }
                                    </span>
                                  </div>

                                  {/* MONTHS */}
                                  {MONTHS.map(
                                    (
                                      item,
                                    ) => {
                                      const value =
                                        getMonthValue(
                                          row,
                                          item.key,
                                        );

                                      return (
                                        <div
                                          key={`${row.account_id}-${item.value}`}
                                          className="border-r border-slate-100 bg-white px-2 py-2 text-right"
                                        >
                                          <span className="text-xs text-slate-700">
                                            {formatNumber(
                                              value,
                                            )}
                                          </span>
                                        </div>
                                      );
                                    },
                                  )}

                                  {/* LAST MONTH */}
                                  <div className="border-r border-slate-100 bg-slate-50 px-2 py-2 text-right">
                                    {formatNumber(
                                      row.last_month,
                                    )}
                                  </div>

                                  {/* ACTUAL */}
                                  <div
                                    className="border-r border-blue-100 bg-blue-50/40 px-2 py-2 text-right"
                                    title={
                                      variancePercent === null
                                        ? `Variance: ${formatNumber(variance)}`
                                        : `Variance: ${formatNumber(variance)} | ${variancePercent.toFixed(1)}%`
                                    }
                                  >
                                    <span className="font-semibold text-blue-800">
                                      {formatNumber(row.actual)}
                                    </span>
                                  </div>

                                  {/* BUDGET */}
                                  <div className="border-r border-amber-100 bg-amber-50/50 px-2 py-2 text-right">
                                    <span className="font-semibold text-amber-800">
                                      {formatNumber(
                                        row.budget,
                                      )}
                                    </span>
                                  </div>

                                  {/* LAST YEAR */}
                                  <div className="border-r border-slate-100 bg-white px-2 py-2 text-right">
                                    {formatNumber(
                                      row.last_year,
                                    )}
                                  </div>

                                  {/* YTD */}
                                  <div className="border-r border-blue-100 bg-blue-50/40 px-2 py-2 text-right">
                                    <span className="font-semibold text-blue-800">
                                      {formatNumber(
                                        row.ytd,
                                      )}
                                    </span>
                                  </div>

                                  {/* YTD BUDGET */}
                                  <div className="border-r border-amber-100 bg-amber-50/50 px-2 py-2 text-right">
                                    <span className="font-semibold text-amber-800">
                                      {formatNumber(
                                        row.ytd_budget,
                                      )}
                                    </span>
                                  </div>

                                  {/* LY YTD */}
                                  <div className="bg-white px-2 py-2 text-right">
                                    {formatNumber(
                                      row.last_year_ytd,
                                    )}
                                  </div>

                                </div>
                              );
                            },
                          )}
                      </div>
                    );
                  },
                )}

                {/* ==========================================
                    TOTAL
                ========================================== */}

                <div
                  className="grid border-t-2 border-slate-300 bg-slate-100 font-bold"
                  style={{
                    gridTemplateColumns:
                      GRID_COLUMNS,
                  }}
                >
                  <div
                    className="sticky left-0 z-10 bg-slate-100 px-3 py-3 text-right text-slate-700"
                    style={{
                      gridColumn:
                        "1 / span 3",
                    }}
                  >
                    GRAND TOTAL
                  </div>

                  {MONTHS.map(
                    (item) => {
                      const total = rows.reduce(
                        (sum, row) =>
                          sum +
                          getMisSign(
                            row.category_code,
                          ) *
                            getMonthValue(
                              row,
                              item.key,
                            ),
                        0,
                      );

                      return (
                        <div
                          key={`total-${item.value}`}
                          className="border-r border-slate-200 px-2 py-3 text-right text-slate-700"
                        >
                          {formatNumber(
                            total,
                          )}
                        </div>
                      );
                    },
                  )}

                  <div className="border-r border-slate-200 bg-slate-50 px-2 py-3 text-right">
                    {formatNumber(
                      getMisNetValue(
                        rows,
                        "last_month",
                      ),
                    )}
                  </div>

                  <div className="border-r border-blue-100 bg-blue-50 px-2 py-3 text-right text-blue-800">
                    {formatNumber(
                      summary.actual,
                    )}
                  </div>

                  <div className="border-r border-amber-100 bg-amber-50 px-2 py-3 text-right text-amber-800">
                    {formatNumber(
                      summary.budget,
                    )}
                  </div>

                  <div className="border-r border-slate-200 px-2 py-3 text-right">
                    {formatNumber(
                      summary.lastYear,
                    )}
                  </div>

                  <div className="border-r border-blue-100 bg-blue-50 px-2 py-3 text-right text-blue-800">
                    {formatNumber(
                      summary.ytd,
                    )}
                  </div>

                  <div className="border-r border-amber-100 bg-amber-50 px-2 py-3 text-right text-amber-800">
                    {formatNumber(
                      summary.ytdBudget,
                    )}
                  </div>

                  <div className="px-2 py-3 text-right">
                    {formatNumber(
                      summary.lastYearYtd,
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ==================================================
            VARIANCE INFO
        ================================================== */}

        {!loading &&
          rows.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

                <div>
                  <div className="text-sm font-semibold text-slate-700">
                    Actual vs Budget
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    Periode{" "}
                    {
                      MONTHS.find(
                        (item) =>
                          item.value ===
                          month,
                      )?.label
                    }{" "}
                    {year}
                  </div>
                </div>

                <div className="flex items-center gap-5">

                  <div className="flex items-center gap-2">
                    {summary.actual >=
                    summary.budget ? (
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}

                    <div>
                      <div className="text-xs text-slate-400">
                        Variance
                      </div>

                      <div className="font-semibold text-slate-700">
                        Rp{" "}
                        {formatNumber(
                          summary.actual -
                            summary.budget,
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400">
                      Variance %
                    </div>

                    <div className="font-semibold text-slate-700">
                      {summary.budget
                        ? `${(
                            ((summary.actual -
                              summary.budget) /
                              Math.abs(
                                summary.budget,
                              )) *
                            100
                          ).toFixed(1)}%`
                        : "-"}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

      </div>
    </div>
  );
}