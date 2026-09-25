import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  FileSpreadsheet,
  Filter,
  Printer,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import { getCustomUser } from "@/lib/authUser";
import {
  exportReport,
  formatReportDisplayDate,
  formatReportDateRange,
} from "@/utils/exportReport";
import { printReport } from "@/utils/printReport";

type AccountCategory =
  | "REVENUE"
  | "OTHER_INCOME"
  | "COGS"
  | "EXPENSE"
  | "OTHER_EXPENSE";

type Account = {
  id: string;
  code: string;
  name: string;
  category_code: AccountCategory | null;
  normal_balance: "D" | "C" | null;
};

type Entity = {
  id: string;
  kode: string;
  nama: string;
};

type JournalDetail = {
  account_id: string;
  debit: number | null;
  credit: number | null;
};

type JournalDetailRow = JournalDetail & {
  journals:
    | {
        entity_id: string | null;
        tanggal: string;
      }
    | {
        entity_id: string | null;
        tanggal: string;
      }[]
    | null;
};

type ReportRow = {
  id: string;
  code: string;
  name: string;
  amount: number;
};

const today = new Date().toISOString().slice(0, 10);
const firstDayOfMonth = `${today.slice(0, 8)}01`;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

function getNormalBalance(account: Account): "D" | "C" {
  if (account.normal_balance) {
    return account.normal_balance;
  }

  return ["COGS", "EXPENSE", "OTHER_EXPENSE"].includes(
    account.category_code ?? "",
  )
    ? "D"
    : "C";
}

export default function IncomeStatementPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [journalDetails, setJournalDetails] = useState<JournalDetail[]>([]);

  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today);

  const [loading, setLoading] = useState(false);
  const [masterLoading, setMasterLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMasterData = async () => {
      setMasterLoading(true);

      const [accountResult, entityResult] = await Promise.all([
        supabase
          .from("accounts")
          .select("id, code, name, category_code, normal_balance")
          .eq("is_active", true)
          .eq("is_posting", true)
          .in("category_code", [
            "REVENUE",
            "OTHER_INCOME",
            "COGS",
            "EXPENSE",
            "OTHER_EXPENSE",
          ])
          .order("code"),

        supabase.from("entities").select("id, kode, nama").order("nama"),
      ]);

      if (accountResult.error) {
        setError(`Gagal memuat COA: ${accountResult.error.message}`);
      } else {
        setAccounts((accountResult.data ?? []) as Account[]);
      }

      if (entityResult.error) {
        setError(`Gagal memuat cabang: ${entityResult.error.message}`);
      } else {
        setEntities((entityResult.data ?? []) as Entity[]);
      }

      setMasterLoading(false);
    };

    loadMasterData();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadJournalDetails = async () => {
      if (
        masterLoading ||
        !startDate ||
        !endDate ||
        startDate > endDate
      ) {
        setJournalDetails([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const FETCH_SIZE = 1000;
        let offset = 0;
        const allDetails: JournalDetail[] = [];

        while (true) {
          let query = supabase
            .from("journal_details")
            .select(
              `
                account_id,
                debit,
                credit,
                journals!inner (
                  entity_id,
                  tanggal
                )
              `,
            )
            .gte("journals.tanggal", startDate)
            .lte("journals.tanggal", endDate)
            .order("id", {
              ascending: true,
            })
            .range(offset, offset + FETCH_SIZE - 1);

          if (selectedEntityId) {
            query = query.eq(
              "journals.entity_id",
              selectedEntityId,
            );
          }

          const {
            data,
            error: journalError,
          } = await query;

          if (journalError) {
            throw journalError;
          }

          const rows =
            (data ?? []) as unknown as JournalDetailRow[];

          allDetails.push(
            ...rows.map((row) => ({
              account_id: row.account_id,
              debit: row.debit,
              credit: row.credit,
            })),
          );

          if (rows.length < FETCH_SIZE) {
            break;
          }

          offset += FETCH_SIZE;
        }

        if (!cancelled) {
          setJournalDetails(allDetails);
        }
      } catch (journalError) {
        console.error(
          "Gagal memuat jurnal Income Statement:",
          journalError,
        );

        if (!cancelled) {
          setJournalDetails([]);

          setError(
            journalError instanceof Error
              ? `Gagal memuat jurnal: ${journalError.message}`
              : "Gagal memuat jurnal.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadJournalDetails();

    return () => {
      cancelled = true;
    };
  }, [
    startDate,
    endDate,
    selectedEntityId,
    masterLoading,
  ]);

  const report = useMemo(() => {
    const mutations = new Map<
      string,
      {
        debit: number;
        credit: number;
      }
    >();

    journalDetails.forEach((detail) => {
      const current =
        mutations.get(detail.account_id) ?? {
          debit: 0,
          credit: 0,
        };

      current.debit += Number(detail.debit ?? 0);
      current.credit += Number(detail.credit ?? 0);

      mutations.set(detail.account_id, current);
    });

    const grouped: Record<AccountCategory, ReportRow[]> = {
      REVENUE: [],
      OTHER_INCOME: [],
      COGS: [],
      EXPENSE: [],
      OTHER_EXPENSE: [],
    };

    accounts.forEach((account) => {
      const category = account.category_code;

      if (!category) return;

      const mutation =
        mutations.get(account.id) ?? {
          debit: 0,
          credit: 0,
        };

      const normalBalance =
        getNormalBalance(account);

      const amount =
        normalBalance === "D"
          ? mutation.debit - mutation.credit
          : mutation.credit - mutation.debit;

      if (Math.abs(amount) <= 0.01) return;

      grouped[category].push({
        id: account.id,
        code: account.code,
        name: account.name,
        amount,
      });
    });

    const total = (category: AccountCategory) =>
      grouped[category].reduce(
        (sum, row) => sum + row.amount,
        0,
      );

    const revenue = total("REVENUE");
    const cogs = total("COGS");
    const grossProfit = revenue - cogs;

    const operatingExpense = total("EXPENSE");
    const operatingProfit =
      grossProfit - operatingExpense;

    const otherIncome = total("OTHER_INCOME");
    const otherExpense = total("OTHER_EXPENSE");

    const netProfit =
      operatingProfit +
      otherIncome -
      otherExpense;

    return {
      grouped,
      revenue,
      cogs,
      grossProfit,
      operatingExpense,
      operatingProfit,
      otherIncome,
      otherExpense,
      netProfit,
    };
  }, [accounts, journalDetails]);

  const buildReportRows = () => {
    const rows: Array<Record<string, unknown>> = [];

    const addSection = (
      title: string,
      sectionRows: ReportRow[],
      totalLabel: string,
      totalAmount: number,
    ) => {
      rows.push({
        keterangan: title,
        jumlah: "",
      });

      sectionRows.forEach((row) => {
        rows.push({
          keterangan: `${row.code} - ${row.name}`,
          jumlah: row.amount,
        });
      });

      rows.push({
        keterangan: totalLabel,
        jumlah: totalAmount,
      });
    };

    addSection(
      "PENDAPATAN",
      report.grouped.REVENUE,
      "Total Pendapatan",
      report.revenue,
    );

    addSection(
      "HARGA POKOK PENJUALAN",
      report.grouped.COGS,
      "Total Harga Pokok Penjualan",
      report.cogs,
    );

    rows.push({
      keterangan: "LABA KOTOR",
      jumlah: report.grossProfit,
    });

    addSection(
      "BEBAN OPERASIONAL",
      report.grouped.EXPENSE,
      "Total Beban Operasional",
      report.operatingExpense,
    );

    rows.push({
      keterangan: "LABA USAHA",
      jumlah: report.operatingProfit,
    });

    addSection(
      "PENDAPATAN LAIN-LAIN",
      report.grouped.OTHER_INCOME,
      "Total Pendapatan Lain-lain",
      report.otherIncome,
    );

    addSection(
      "BEBAN LAIN-LAIN",
      report.grouped.OTHER_EXPENSE,
      "Total Beban Lain-lain",
      report.otherExpense,
    );

    rows.push({
      keterangan: "LABA BERSIH PERIODE BERJALAN",
      jumlah: report.netProfit,
    });

    return rows;
  };

  const handleExportExcel = () => {
    try {
      const rows = buildReportRows();

      exportReport({
        filename: `Income_Statement_${formatReportDateRange(
          new Date(`${startDate}T00:00:00`),
          new Date(`${endDate}T00:00:00`),
        )}.xlsx`,

        sheetName: "Income Statement",

        columns: [
          {
            label: "Keterangan",
            key: "keterangan",
          },
          {
            label: "Jumlah",
            key: "jumlah",
            format: (value) =>
              value === "" ||
              value === null ||
              value === undefined
                ? ""
                : formatCurrency(Number(value)),
          },
        ],

        rows,
      });
    } catch (error) {
      console.error(
        "Export Income Statement gagal:",
        error,
      );

      alert("Gagal melakukan export Income Statement.");
    }
  };

  const handlePrint = () => {
    try {
      const rows = buildReportRows();

      const currentUser = getCustomUser();

      const printedBy = currentUser?.name || "-";

      printReport({
        title: "INCOME STATEMENT",

        period: `${formatReportDisplayDate(
          new Date(`${startDate}T00:00:00`),
        )} s/d ${formatReportDisplayDate(
          new Date(`${endDate}T00:00:00`),
        )}`,

        orientation: "portrait",

        printedBy,

        columns: [
          {
            label: "Keterangan",
            key: "keterangan",
          },
          {
            label: "Jumlah",
            key: "jumlah",
            align: "right",
            format: (value) =>
              value === "" ||
              value === null ||
              value === undefined
                ? ""
                : formatCurrency(Number(value)),
          },
        ],

        rows,
      });
    } catch (error) {
      console.error(
        "Print Income Statement gagal:",
        error,
      );

      alert("Gagal mencetak Income Statement.");
    }
  };

  const renderRows = (rows: ReportRow[]) =>
    rows.map((row) => (
      <tr
        key={row.id}
        className="border-b border-slate-100 transition-colors hover:bg-slate-50"
      >
        <td className="px-6 py-3 align-middle">
          <div className="mx-auto w-full max-w-[520px] text-left">
            <div className="font-medium text-slate-700">
              {row.code} - {row.name}
            </div>           
          </div>
        </td>

        <td className="whitespace-nowrap px-5 py-2.5 text-right text-sm font-medium tabular-nums text-slate-700">
          {formatCurrency(row.amount)}
        </td>
      </tr>
    ));

  const selectedEntity = entities.find(
    (entity) => entity.id === selectedEntityId,
  );

  const periodLabel =
    startDate && endDate
      ? `${formatReportDisplayDate(
          new Date(`${startDate}T00:00:00`),
        )} s/d ${formatReportDisplayDate(
          new Date(`${endDate}T00:00:00`),
        )}`
      : "-";

  const resetFilters = () => {
    setSelectedEntityId("");
    setStartDate(firstDayOfMonth);
    setEndDate(today);
  };

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <div className="mx-auto w-full max-w-[1600px] space-y-5">

        {/* =========================================================
            HEADER
        ========================================================= */}
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <TrendingUp size={22} />
              </div>

              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-800 md:text-2xl">
                  Income Statement
                </h1>

                <p className="mt-0.5 text-sm text-slate-500">
                  Laporan laba rugi berdasarkan transaksi jurnal
                  pada periode yang dipilih.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Periode Laporan
            </div>

            <div className="mt-0.5 text-sm font-semibold text-slate-700">
              {periodLabel}
            </div>

            {selectedEntity && (
              <div className="mt-0.5 text-xs text-slate-500">
                {selectedEntity.kode} - {selectedEntity.nama}
              </div>
            )}
          </div>
        </div>

        {/* =========================================================
            FILTER
        ========================================================= */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm ring-1 ring-slate-200">
                <Filter size={16} />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-slate-800">
                  Filter Laporan
                </h2>

                <p className="text-xs text-slate-500">
                  Tentukan cabang dan periode laporan.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={resetFilters}
              disabled={masterLoading || loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={14} />
              Reset Filter
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Building2 size={14} />
                Cabang
              </label>

              <select
                value={selectedEntityId}
                onChange={(event) =>
                  setSelectedEntityId(event.target.value)
                }
                disabled={masterLoading}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              >
                <option value="">
                  Semua Cabang
                </option>

                {entities.map((entity) => (
                  <option
                    key={entity.id}
                    value={entity.id}
                  >
                    {entity.kode} - {entity.nama}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <CalendarDays size={14} />
                Dari Tanggal
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(event) =>
                  setStartDate(event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <CalendarDays size={14} />
                Sampai Tanggal
              </label>

              <input
                type="date"
                value={endDate}
                onChange={(event) =>
                  setEndDate(event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </div>

        {/* =========================================================
            VALIDATION / ERROR
        ========================================================= */}
        {startDate > endDate && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <div className="font-semibold">
              Periode tidak valid
            </div>

            <div className="mt-0.5 text-xs">
              Tanggal awal tidak boleh melebihi tanggal akhir.
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <div className="font-semibold">
              Terjadi kesalahan
            </div>

            <div className="mt-0.5">
              {error}
            </div>
          </div>
        )}

        {/* =========================================================
            SUMMARY CARDS
        ========================================================= */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

          {/* Pendapatan */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Total Pendapatan
                </p>

                <p className="mt-2 text-xl font-bold text-slate-800">
                  Rp {formatCurrency(report.revenue)}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <TrendingUp size={19} />
              </div>
            </div>

            <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
              Pendapatan selama periode laporan
            </div>
          </div>

          {/* Laba Kotor */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Laba Kotor
                </p>

                <p className="mt-2 text-xl font-bold text-slate-800">
                  Rp {formatCurrency(report.grossProfit)}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <TrendingUp size={19} />
              </div>
            </div>

            <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
              Pendapatan dikurangi harga pokok penjualan
            </div>
          </div>

          {/* Laba Bersih */}
          <div
            className={`rounded-xl border p-5 shadow-sm ${
              report.netProfit >= 0
                ? "border-emerald-200 bg-emerald-50/50"
                : "border-red-200 bg-red-50/50"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Laba Bersih
                </p>

                <p
                  className={`mt-2 text-xl font-bold ${
                    report.netProfit >= 0
                      ? "text-emerald-700"
                      : "text-red-700"
                  }`}
                >
                  Rp {formatCurrency(report.netProfit)}
                </p>
              </div>

              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  report.netProfit >= 0
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {report.netProfit >= 0 ? (
                  <TrendingUp size={19} />
                ) : (
                  <TrendingDown size={19} />
                )}
              </div>
            </div>

            <div className="mt-3 border-t border-current/10 pt-3 text-xs text-slate-500">
              Laba bersih periode berjalan
            </div>
          </div>
        </div>

        {/* =========================================================
            REPORT CARD
        ========================================================= */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

          {/* Report Header */}
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <TrendingUp size={16} />
                </div>

                <h2 className="text-sm font-bold text-slate-800">
                  Rincian Income Statement
                </h2>
              </div>

              <p className="mt-1 text-xs text-slate-500">
                {periodLabel}
                {selectedEntity
                  ? ` • ${selectedEntity.kode} - ${selectedEntity.nama}`
                  : " • Semua Cabang"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={
                  loading ||
                  masterLoading ||
                  startDate > endDate
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileSpreadsheet size={15} />
                Export Excel
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={
                  loading ||
                  masterLoading ||
                  startDate > endDate
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Printer size={15} />
                Cetak
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="max-h-[calc(100vh-360px)] min-h-[400px] overflow-auto">
            <table className="min-w-full text-sm">

              <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 shadow-sm">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide">
                    Keterangan
                  </th>

                  <th className="w-[260px] px-5 py-3 text-right text-xs font-bold uppercase tracking-wide">
                    Jumlah
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-5 py-14 text-center"
                    >
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />

                        <div className="text-sm font-medium text-slate-600">
                          Memuat Income Statement...
                        </div>

                        <div className="text-xs text-slate-400">
                          Mengambil transaksi jurnal pada periode yang dipilih.
                        </div>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && (
                  <>
                    {/* =================================================
                        PENDAPATAN
                    ================================================= */}
                    <tr className="border-b border-blue-100 bg-blue-50/70">
                      <td
                        colSpan={2}
                        className="px-5 py-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-900">
                            Pendapatan
                          </span>

                          <span className="text-xs font-medium text-blue-600">
                            REVENUE
                          </span>
                        </div>
                      </td>
                    </tr>

                    {renderRows(
                      report.grouped.REVENUE,
                    )}

                    <tr className="border-b border-slate-200 bg-slate-50">
                      <td className="px-5 py-3 pl-8 font-semibold text-slate-700">
                        Total Pendapatan
                      </td>

                      <td className="px-5 py-3 text-right font-bold tabular-nums text-slate-800">
                        {formatCurrency(report.revenue)}
                      </td>
                    </tr>

                    {/* =================================================
                        HPP
                    ================================================= */}
                    <tr className="border-b border-blue-100 bg-blue-50/70">
                      <td
                        colSpan={2}
                        className="px-5 py-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-900">
                            Harga Pokok Penjualan
                          </span>

                          <span className="text-xs font-medium text-blue-600">
                            COGS
                          </span>
                        </div>
                      </td>
                    </tr>

                    {renderRows(
                      report.grouped.COGS,
                    )}

                    <tr className="border-b border-slate-200 bg-slate-50">
                      <td className="px-5 py-3 pl-8 font-semibold text-slate-700">
                        Total Harga Pokok Penjualan
                      </td>

                      <td className="px-5 py-3 text-right font-bold tabular-nums text-slate-800">
                        {formatCurrency(report.cogs)}
                      </td>
                    </tr>

                    {/* =================================================
                        LABA KOTOR
                    ================================================= */}
                    <tr className="border-b border-blue-200 bg-blue-100/70">
                      <td className="px-5 py-3 font-bold text-blue-900">
                        Laba Kotor
                      </td>

                      <td className="px-5 py-3 text-right text-base font-bold tabular-nums text-blue-900">
                        {formatCurrency(
                          report.grossProfit,
                        )}
                      </td>
                    </tr>

                    {/* =================================================
                        BEBAN OPERASIONAL
                    ================================================= */}
                    <tr className="border-b border-blue-100 bg-blue-50/70">
                      <td
                        colSpan={2}
                        className="px-5 py-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-900">
                            Beban Operasional
                          </span>

                          <span className="text-xs font-medium text-blue-600">
                            EXPENSE
                          </span>
                        </div>
                      </td>
                    </tr>

                    {renderRows(
                      report.grouped.EXPENSE,
                    )}

                    <tr className="border-b border-slate-200 bg-slate-50">
                      <td className="px-5 py-3 pl-8 font-semibold text-slate-700">
                        Total Beban Operasional
                      </td>

                      <td className="px-5 py-3 text-right font-bold tabular-nums text-slate-800">
                        {formatCurrency(
                          report.operatingExpense,
                        )}
                      </td>
                    </tr>

                    {/* =================================================
                        LABA USAHA
                    ================================================= */}
                    <tr className="border-b border-blue-200 bg-blue-100/70">
                      <td className="px-5 py-3 font-bold text-blue-900">
                        Laba Usaha
                      </td>

                      <td className="px-5 py-3 text-right text-base font-bold tabular-nums text-blue-900">
                        {formatCurrency(
                          report.operatingProfit,
                        )}
                      </td>
                    </tr>

                    {/* =================================================
                        PENDAPATAN LAIN-LAIN
                    ================================================= */}
                    <tr className="border-b border-blue-100 bg-blue-50/70">
                      <td
                        colSpan={2}
                        className="px-5 py-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-900">
                            Pendapatan Lain-lain
                          </span>

                          <span className="text-xs font-medium text-blue-600">
                            OTHER INCOME
                          </span>
                        </div>
                      </td>
                    </tr>

                    {renderRows(
                      report.grouped.OTHER_INCOME,
                    )}

                    <tr className="border-b border-slate-200 bg-slate-50">
                      <td className="px-5 py-3 pl-8 font-semibold text-slate-700">
                        Total Pendapatan Lain-lain
                      </td>

                      <td className="px-5 py-3 text-right font-bold tabular-nums text-slate-800">
                        {formatCurrency(
                          report.otherIncome,
                        )}
                      </td>
                    </tr>

                    {/* =================================================
                        BEBAN LAIN-LAIN
                    ================================================= */}
                    <tr className="border-b border-blue-100 bg-blue-50/70">
                      <td
                        colSpan={2}
                        className="px-5 py-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-900">
                            Beban Lain-lain
                          </span>

                          <span className="text-xs font-medium text-blue-600">
                            OTHER EXPENSE
                          </span>
                        </div>
                      </td>
                    </tr>

                    {renderRows(
                      report.grouped.OTHER_EXPENSE,
                    )}

                    <tr className="border-b border-slate-200 bg-slate-50">
                      <td className="px-5 py-3 pl-8 font-semibold text-slate-700">
                        Total Beban Lain-lain
                      </td>

                      <td className="px-5 py-3 text-right font-bold tabular-nums text-slate-800">
                        {formatCurrency(
                          report.otherExpense,
                        )}
                      </td>
                    </tr>

                    {/* =================================================
                        NET PROFIT
                    ================================================= */}
                    <tr
                      className={`border-t-2 ${
                        report.netProfit >= 0
                          ? "border-emerald-300 bg-emerald-100/80"
                          : "border-red-300 bg-red-100/80"
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {report.netProfit >= 0 ? (
                            <TrendingUp
                              size={18}
                              className="text-emerald-700"
                            />
                          ) : (
                            <TrendingDown
                              size={18}
                              className="text-red-700"
                            />
                          )}

                          <span
                            className={`text-base font-bold ${
                              report.netProfit >= 0
                                ? "text-emerald-900"
                                : "text-red-900"
                            }`}
                          >
                            Laba Bersih Periode Berjalan
                          </span>
                        </div>
                      </td>

                      <td
                        className={`px-5 py-4 text-right text-lg font-bold tabular-nums ${
                          report.netProfit >= 0
                            ? "text-emerald-800"
                            : "text-red-800"
                        }`}
                      >
                        {formatCurrency(
                          report.netProfit,
                        )}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {!loading && (
            <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Laporan berdasarkan jurnal yang telah diposting.
              </span>

              <span className="font-medium text-slate-600">
                {periodLabel}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}