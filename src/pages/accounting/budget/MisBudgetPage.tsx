import { useMemo, useState } from "react";
import {
  Calculator,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Loader2,
  RefreshCw,
  Save,
  Search,
  WalletCards,
} from "lucide-react";

import { getCustomUser } from "@/lib/authUser";

import { useMisBudget } from "./useMisBudget";
import type { MisBudgetRow } from "./types";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const CATEGORY_ORDER = [
  "REVENUE",
  "OTHER_INCOME",
  "COGS",
  "EXPENSE",
  "OTHER_EXPENSE",
];

const CATEGORY_LABELS: Record<string, string> = {
  REVENUE: "Revenue",
  OTHER_INCOME: "Other Income",
  COGS: "COGS",
  EXPENSE: "Expense",
  OTHER_EXPENSE: "Other Expense",
};

const GRID_COLUMNS =
  "95px 270px 220px repeat(12, 120px) 145px 105px";

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function parseNumber(value: string) {
  const cleaned = value
    .replace(/\./g, "")
    .replace(/,/g, "")
    .replace(/[^\d-]/g, "");

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : 0;
}

function getRowTotal(row: MisBudgetRow) {
  return row.months.reduce(
    (total, value) =>
      total + Number(value || 0),
    0,
  );
}

export default function MisBudgetPage() {
  const currentYear = new Date().getFullYear();

  /*
   * Standar project:
   * custom user -> entity_id
   */
  const currentUser = getCustomUser();

  const entityId =
    currentUser?.entity_id ?? null;

  const [budgetYear, setBudgetYear] =
    useState(currentYear);

  const [search, setSearch] =
    useState("");

  const [category, setCategory] =
    useState("ALL");

  const [bulkTotals, setBulkTotals] =
    useState<Record<string, string>>({});

  const [savingAccount, setSavingAccount] =
    useState<string | null>(null);

  const [openCategories, setOpenCategories] =
    useState<Record<string, boolean>>({
      REVENUE: true,
      OTHER_INCOME: true,
      COGS: true,
      EXPENSE: true,
      OTHER_EXPENSE: true,
    });

  const {
    rows,
    loading,
    saving,
    error,
    updateMonth,
    saveRow,
    saveAll,
    reload,
  } = useMisBudget(
    entityId,
    budgetYear,
  );

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

      const matchesCategory =
        category === "ALL" ||
        row.category_code === category;

      return (
        matchesSearch &&
        matchesCategory
      );
    });
  }, [rows, search, category]);

  /* ======================================================
     GROUP
  ====================================================== */

  const groupedRows = useMemo(() => {
    const result: Record<
      string,
      MisBudgetRow[]
    > = {};

    for (const code of CATEGORY_ORDER) {
      result[code] = [];
    }

    for (const row of filteredRows) {
      if (!result[row.category_code]) {
        result[row.category_code] = [];
      }

      result[row.category_code].push(row);
    }

    return result;
  }, [filteredRows]);

  /* ======================================================
     MONTH TOTAL
  ====================================================== */

  const monthlyTotals = useMemo(() => {
    return MONTHS.map((_, monthIndex) =>
      rows.reduce(
        (total, row) =>
          total +
          Number(
            row.months[monthIndex] || 0,
          ),
        0,
      ),
    );
  }, [rows]);

  const grandTotal = useMemo(
    () =>
      monthlyTotals.reduce(
        (total, value) =>
          total + value,
        0,
      ),
    [monthlyTotals],
  );

  /* ======================================================
     CATEGORY TOTAL
  ====================================================== */

  const getCategoryTotal = (
    categoryCode: string,
  ) => {
    return rows
      .filter(
        (row) =>
          row.category_code ===
          categoryCode,
      )
      .reduce(
        (total, row) =>
          total + getRowTotal(row),
        0,
      );
  };

  /* ======================================================
     BULK
  ====================================================== */

  const handleBulkChange = (
    accountId: string,
    value: string,
  ) => {
    setBulkTotals((current) => ({
      ...current,
      [accountId]: value,
    }));
  };

  const distributeBulkTotal = (
    row: MisBudgetRow,
  ) => {
    const value =
      bulkTotals[row.account_id] ??
      "";

    const total = parseNumber(value);

    if (!Number.isFinite(total)) {
      return;
    }

    const base = Math.floor(
      total / 12,
    );

    const remainder =
      total - base * 12;

    const months = Array(12).fill(
      base,
    ) as number[];

    /*
     * Jika ada sisa, dimasukkan
     * mulai dari Januari.
     */
    for (
      let index = 0;
      index < remainder;
      index++
    ) {
      months[index] += 1;
    }

    months.forEach(
      (monthValue, monthIndex) => {
        updateMonth(
          row.account_id,
          monthIndex,
          monthValue,
        );
      },
    );
  };

  const clearBulk = (
    accountId: string,
  ) => {
    setBulkTotals((current) => {
      const next = {
        ...current,
      };

      delete next[accountId];

      return next;
    });
  };

  /* ======================================================
     SAVE
  ====================================================== */

  const handleSaveRow = async (
    row: MisBudgetRow,
  ) => {
    try {
      setSavingAccount(
        row.account_id,
      );

      await saveRow(row);

      clearBulk(row.account_id);
    } catch {
      // Hook sudah menangani error.
    } finally {
      setSavingAccount(null);
    }
  };

  const handleSaveAll = async () => {
    try {
      await saveAll();

      setBulkTotals({});
    } catch {
      // Hook sudah menangani error.
    }
  };

  /* ======================================================
     CATEGORY TOGGLE
  ====================================================== */

  const toggleCategory = (
    categoryCode: string,
  ) => {
    setOpenCategories(
      (current) => ({
        ...current,
        [categoryCode]:
          !current[categoryCode],
      }),
    );
  };

  /* ======================================================
     ENTITY
  ====================================================== */

  if (!entityId) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-3">
            <CircleDollarSign className="h-5 w-5 text-amber-600" />

            <div>
              <div className="font-semibold text-amber-900">
                Entity belum tersedia
              </div>

              <div className="mt-1 text-sm text-amber-700">
                User belum memiliki
                entity_id sehingga Budget
                MIS belum dapat dimuat.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-[1800px] space-y-5">

        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <WalletCards className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-xl font-bold text-slate-800">
                Budget MIS
              </h1>

              <p className="text-sm text-slate-500">
                Budget tahunan per akun
                untuk kebutuhan MIS Report.
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
                value={budgetYear}
                onChange={(event) =>
                  setBudgetYear(
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
                ).map((year) => (
                  <option
                    key={year}
                    value={year}
                  >
                    {year}
                  </option>
                ))}
              </select>
            </div>

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

            {/* SAVE ALL */}
            <button
              type="button"
              onClick={() =>
                void handleSaveAll()
              }
              disabled={
                saving ||
                loading ||
                rows.length === 0
              }
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}

              Simpan Semua
            </button>
          </div>
        </div>

        {/* ==================================================
            SUMMARY
        ================================================== */}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Total Budget Tahunan
            </div>

            <div className="mt-2 text-xl font-bold text-slate-800">
              Rp {formatRupiah(grandTotal)}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Seluruh akun • {budgetYear}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Total Akun
            </div>

            <div className="mt-2 text-xl font-bold text-slate-800">
              {rows.length}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Akun posting aktif
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Rata-rata / Bulan
            </div>

            <div className="mt-2 text-xl font-bold text-slate-800">
              Rp{" "}
              {formatRupiah(
                grandTotal / 12,
              )}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Berdasarkan budget tahunan
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-blue-500">
              Mode Input
            </div>

            <div className="mt-2 flex items-center gap-2 text-sm font-bold text-blue-800">
              <Calculator className="h-4 w-4" />

              Bulk + Manual
            </div>

            <div className="mt-1 text-xs text-blue-600">
              Bulk otomatis, bulan tetap
              editable.
            </div>
          </div>
        </div>

        {/* ==================================================
            FILTER
        ================================================== */}

        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">

            <div className="relative flex-1">
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

              {CATEGORY_ORDER.map(
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

            <div className="text-xs text-slate-400">
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
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ==================================================
            LOADING
        ================================================== */}

        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Memuat Budget MIS...
            </div>
          </div>
        ) : (
          /* ==================================================
             GRID
          ================================================== */
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

            <div className="overflow-x-auto">

              <div
                className="min-w-[1835px]"
              >

                {/* ==========================================
                    HEADER ROW
                ========================================== */}

                <div
                  className="grid border-b border-slate-200 bg-slate-100"
                  style={{
                    gridTemplateColumns:
                      GRID_COLUMNS,
                  }}
                >
                  <div className="sticky left-0 z-20 border-r border-slate-200 bg-slate-100 px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Kode
                  </div>

                  <div className="sticky left-[95px] z-20 border-r border-slate-200 bg-slate-100 px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Nama Akun
                  </div>

                  <div className="border-r border-blue-100 bg-blue-50 px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-blue-600">
                    Bulk Total
                  </div>

                  {MONTHS.map(
                    (month, index) => (
                      <div
                        key={month}
                        className={`border-r border-slate-200 bg-slate-100 px-2 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500 ${
                          index === 11
                            ? "border-r-0"
                            : ""
                        }`}
                      >
                        {month}
                      </div>
                    ),
                  )}

                  <div className="border-r border-slate-200 bg-slate-100 px-3 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-700">
                    Total
                  </div>

                  <div className="bg-slate-100 px-3 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                    Aksi
                  </div>
                </div>

                {/* ==========================================
                    CATEGORY + ACCOUNTS
                ========================================== */}

                {CATEGORY_ORDER.map(
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

                    const categoryTotal =
                      getCategoryTotal(
                        categoryCode,
                      );

                    return (
                      <div
                        key={categoryCode}
                      >

                        {/* CATEGORY HEADER */}
                        <div
                          className="grid border-b border-slate-200 bg-slate-50"
                          style={{
                            gridTemplateColumns:
                              GRID_COLUMNS,
                            backgroundColor:
                              "#f8fafc",
                          }}
                        >
                          <div
                            className="sticky left-0 z-10 bg-slate-50 px-3 py-2"
                            style={{
                              gridColumn:
                                "1 / span 2",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                toggleCategory(
                                  categoryCode,
                                )
                              }
                              className="flex items-center gap-2 text-left"
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
                            className="bg-slate-50 px-3 py-2 text-right"
                            style={{
                              gridColumn:
                                "3 / span 14",
                            }}
                          >
                            <span className="text-xs font-semibold text-slate-500">
                              Total Kategori:
                            </span>{" "}
                            <span className="text-sm font-bold text-slate-700">
                              Rp{" "}
                              {formatRupiah(
                                categoryTotal,
                              )}
                            </span>
                          </div>

                          <div />
                        </div>

                        {/* ACCOUNTS */}
                        {isOpen &&
                          categoryRows.map(
                            (row) => {
                              const total =
                                getRowTotal(
                                  row,
                                );

                              const bulkValue =
                                bulkTotals[
                                  row.account_id
                                ] ?? "";

                              const isSaving =
                                savingAccount ===
                                row.account_id;

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
                                      className="max-w-[250px] truncate font-medium text-slate-700"
                                      title={
                                        row.account_name
                                      }
                                    >
                                      {
                                        row.account_name
                                      }
                                    </div>
                                  </div>

                                  {/* BULK */}
                                  <div className="border-r border-blue-100 bg-blue-50/40 px-2 py-2">
                                    <div className="flex items-center gap-1">

                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        value={
                                          bulkValue
                                        }
                                        onChange={(
                                          event,
                                        ) =>
                                          handleBulkChange(
                                            row.account_id,
                                            event
                                              .target
                                              .value,
                                          )
                                        }
                                        placeholder="Total tahunan"
                                        className="h-8 min-w-0 flex-1 rounded-md border border-blue-200 bg-white px-2 text-right text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                      />

                                      <button
                                        type="button"
                                        onClick={() =>
                                          distributeBulkTotal(row)
                                        }
                                        disabled={!bulkValue}
                                        title="Bagi rata ke 12 bulan"
                                        aria-label="Bagi rata ke 12 bulan"
                                        className="group relative flex h-8 w-9 shrink-0 items-center justify-center rounded-md border border-blue-500 bg-blue-600 text-white shadow-sm transition-all duration-150 hover:bg-blue-700 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:border-blue-200 disabled:bg-blue-300"
                                      >
                                        <Calculator className="h-4 w-4 stroke-[2.2]" />

                                        <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-lg group-hover:block">
                                          Bagi rata 12 bulan
                                        </span>
                                      </button>

                                      {bulkValue && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            clearBulk(
                                              row.account_id,
                                            )
                                          }
                                          title="Kosongkan bulk"
                                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-sm font-semibold text-slate-400 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                                        >
                                          ×
                                        </button>
                                      )}

                                    </div>
                                  </div>

                                  {/* MONTHS */}
                                  {row.months.map(
                                    (
                                      value,
                                      monthIndex,
                                    ) => (
                                      <div
                                        key={`${row.account_id}-${monthIndex}`}
                                        className={`border-r border-slate-100 bg-white px-1 py-2 ${
                                          monthIndex === 11
                                            ? "border-r-0"
                                            : ""
                                        }`}
                                      >
                                        <input
                                          type="text"
                                          inputMode="numeric"
                                          value={
                                            value ===
                                            0
                                              ? ""
                                              : formatRupiah(
                                                  value,
                                                )
                                          }
                                          placeholder="0"
                                          onChange={(
                                            event,
                                          ) => {
                                            updateMonth(
                                              row.account_id,
                                              monthIndex,
                                              parseNumber(
                                                event
                                                  .target
                                                  .value,
                                              ),
                                            );
                                          }}
                                          className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-right text-xs text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                        />
                                      </div>
                                    ),
                                  )}

                                  {/* TOTAL */}
                                  <div className="border-r border-slate-100 bg-slate-50 px-3 py-2 text-right">
                                    <div className="font-bold text-slate-700">
                                      {formatRupiah(
                                        total,
                                      )}
                                    </div>
                                  </div>

                                  {/* ACTION */}
                                  <div className="px-2 py-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleSaveRow(
                                          row,
                                        )
                                      }
                                      disabled={
                                        isSaving
                                      }
                                      className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-blue-200 bg-white px-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {isSaving ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Save className="h-3.5 w-3.5" />
                                      )}

                                      Simpan
                                    </button>
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
                    GRAND TOTAL
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
                        "1 / span 2",
                    }}
                  >
                    GRAND TOTAL
                  </div>

                  <div className="border-l border-slate-200 px-3 py-3 text-right text-slate-700">
                    Rp{" "}
                    {formatRupiah(
                      grandTotal,
                    )}
                  </div>

                  {monthlyTotals.map(
                    (
                      total,
                      index,
                    ) => (
                      <div
                        key={`grand-${index}`}
                        className="border-l border-slate-200 px-2 py-3 text-right text-slate-700"
                      >
                        {formatRupiah(
                          total,
                        )}
                      </div>
                    ),
                  )}

                  <div className="border-l border-slate-200 px-3 py-3 text-right text-blue-700">
                    Rp{" "}
                    {formatRupiah(
                      grandTotal,
                    )}
                  </div>

                  <div />
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ==================================================
            HELP
        ================================================== */}

        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
          <div className="text-sm font-semibold text-blue-800">
            Cara input budget
          </div>

          <div className="mt-1 text-xs leading-5 text-blue-700">
            Isi{" "}
            <strong>Bulk Total</strong>{" "}
            untuk menentukan budget tahunan,
            lalu klik ikon kalkulator.
            Sistem akan membagi total ke 12
            bulan. Setelah itu nilai Jan–Des
            tetap dapat diedit satu per satu.
          </div>
        </div>

      </div>
    </div>
  );
}