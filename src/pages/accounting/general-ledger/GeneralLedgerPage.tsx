import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Pagination from "@/components/common/Pagination";
import {
  exportReport,
  formatReportDateRange,
  formatReportDisplayDate,
} from "@/utils/exportReport";
import { printReport } from "@/utils/printReport";
import { getCustomUser } from "@/lib/authUser";
import { formatDateIndonesia } from "@/pages/procurement/utils/date";
import SearchableSelect from "@/components/common/SearchableSelect";

type Account = {
  id: string;
  code: string;
  name: string;
  normal_balance: "D" | "C" | null;
};

type Entity = {
  id: string;
  kode: string;
  nama: string;
};

type JournalDetail = {
  id: string;
  debit: number | null;
  credit: number | null;
  description: string | null;
  account_id?: string | null;
  account?: {
    code: string;
    name: string;
  } | null;
};

type Journal = {
  id: string;
  tanggal: string;
  waktu: string | null;
  reference: string | null;
  description: string | null;
  entity_id: string | null;
  user_id?: string | null;
  journal_details: JournalDetail[];
};

type LedgerEntry = {
  id: string;
  tanggal: string;
  waktu: string | null;
  reference: string | null;
  description: string;
  debit: number;
  credit: number;
  balance: number;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

const today = new Date().toISOString().slice(0, 10);
const firstDayOfMonth = `${today.slice(0, 8)}01`;

const OPENING_FETCH_SIZE = 1000;

export default function GeneralLedgerPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [detailJournal, setDetailJournal] = useState<Journal | null>(null);
  const [detailUserName, setDetailUserName] = useState<string>("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today);

  const [loading, setLoading] = useState(false);
  const [masterLoading, setMasterLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openingBalance, setOpeningBalance] = useState(0);
  const [pageOpeningBalance, setPageOpeningBalance] = useState(0);
  const [pageOpeningLoading, setPageOpeningLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    const loadMasterData = async () => {
      setMasterLoading(true);

      const [accountsResult, entitiesResult] = await Promise.all([
        supabase
          .from("accounts")
          .select("id, code, name, normal_balance")
          .eq("is_active", true)
          .eq("is_posting", true)
          .order("code"),

        supabase.from("entities").select("id, kode, nama").order("nama"),
      ]);

      if (accountsResult.error) {
        setError(`Gagal memuat COA: ${accountsResult.error.message}`);
      } else {
        const accountRows = (accountsResult.data ?? []) as Account[];

        setAccounts(accountRows);

        if (accountRows.length > 0) {
          setSelectedAccountId(accountRows[0].id);
        }
      }

      if (entitiesResult.error) {
        setError(`Gagal memuat cabang: ${entitiesResult.error.message}`);
      } else {
        setEntities((entitiesResult.data ?? []) as Entity[]);
      }

      setMasterLoading(false);
    };

    loadMasterData();
  }, []);

  /*
   * Ambil saldo sebelum tanggal awal.
   *
   * Tidak menggunakan satu query besar karena Supabase
   * dapat membatasi hasil pada 1000 baris.
   *
   * Data diambil bertahap 1000 baris sampai selesai.
   */
  useEffect(() => {
    let cancelled = false;

    const loadOpeningBalance = async () => {
      if (!selectedAccountId || !startDate || startDate > endDate) {
        setOpeningBalance(0);
        return;
      }

      let offset = 0;
      let balance = 0;

      try {
        while (true) {
          let query = supabase
            .from("journal_details")
            .select(
              `
              debit,
              credit,
              journals!inner (
                entity_id,
                tanggal
              )
            `,
            )
            .eq("account_id", selectedAccountId)
            .lt("journals.tanggal", startDate)
            .range(offset, offset + OPENING_FETCH_SIZE - 1);

          if (selectedEntityId) {
            query = query.eq("journals.entity_id", selectedEntityId);
          }

          const { data, error: openingError } = await query;

          if (openingError) {
            throw openingError;
          }

          const rows = (data ?? []) as Array<{
            debit: number | null;
            credit: number | null;
          }>;

          for (const detail of rows) {
            balance += getBalanceChangeForAccount(
              detail.debit,
              detail.credit,
              selectedAccountId,
              accounts,
            );
          }

          if (rows.length < OPENING_FETCH_SIZE) {
            break;
          }

          offset += OPENING_FETCH_SIZE;
        }

        if (!cancelled) {
          setOpeningBalance(balance);
        }
      } catch (openingError) {
        console.error("Gagal menghitung saldo awal:", openingError);

        if (!cancelled) {
          setOpeningBalance(0);
          setError(
            openingError instanceof Error
              ? `Gagal menghitung saldo awal: ${openingError.message}`
              : "Gagal menghitung saldo awal.",
          );
        }
      }
    };

    void loadOpeningBalance();

    return () => {
      cancelled = true;
    };
  }, [selectedAccountId, selectedEntityId, startDate, endDate, accounts]);

  /*
   * Ambil data Buku Besar yang sedang ditampilkan.
   *
   * Berbeda dengan kode lama:
   * - tanggal difilter langsung di database
   * - hanya halaman aktif yang diambil
   * - count exact digunakan untuk pagination
   */
  useEffect(() => {
    const loadLedgerData = async () => {
      if (
        masterLoading ||
        !selectedAccountId ||
        !startDate ||
        !endDate ||
        startDate > endDate
      ) {
        setJournals([]);
        setTotal(0);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from("journals")
          .select(
            `
              id,
              tanggal,
              waktu,
              reference,
              description,
              entity_id,
              journal_details!inner (
                id,
                debit,
                credit,
                description
              )
            `,
            {
              count: "exact",
            },
          )
          .eq("journal_details.account_id", selectedAccountId)
          .gte("tanggal", startDate)
          .lte("tanggal", endDate)
          .order("tanggal", {
            ascending: true,
          })
          .order("waktu", {
            ascending: true,
          })
          .order("id", {
            ascending: true,
          });

        if (selectedEntityId) {
          query = query.eq("entity_id", selectedEntityId);
        }

        const from = (page - 1) * pageSize;

        const to = from + pageSize - 1;

        query = query.range(from, to);

        const { data, error: journalError, count } = await query;

        if (journalError) {
          throw journalError;
        }

        setJournals((data ?? []) as Journal[]);

        setTotal(count ?? 0);
      } catch (journalError) {
        console.error("Gagal memuat Buku Besar:", journalError);

        setError(
          journalError instanceof Error
            ? `Gagal memuat Buku Besar: ${journalError.message}`
            : "Gagal memuat Buku Besar.",
        );

        setJournals([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    loadLedgerData();
  }, [
    selectedAccountId,
    selectedEntityId,
    startDate,
    endDate,
    page,
    pageSize,
    masterLoading,
  ]);

  /*
   * Jika filter berubah, kembali ke halaman pertama.
   */
  useEffect(() => {
    setPage(1);
  }, [selectedAccountId, selectedEntityId, startDate, endDate]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(total / pageSize));

    if (page > maxPage) {
      setPage(maxPage);
    }

    if (total === 0 && page !== 1) {
      setPage(1);
    }
  }, [total, page, pageSize]);

  const selectedAccount = accounts.find(
    (account) => account.id === selectedAccountId,
  );

  const normalBalance = selectedAccount?.normal_balance ?? "D";

  const getBalanceChange = (debit: number, credit: number) => {
    return normalBalance === "D" ? debit - credit : credit - debit;
  };

  /*
   * Saldo awal halaman aktif.
   *
   * Halaman 1 dimulai dari saldo sebelum periode.
   * Halaman berikutnya dimulai dari saldo setelah seluruh transaksi
   * pada halaman-halaman sebelumnya. Dengan demikian running balance
   * tidak kembali ke saldo awal periode ketika pagination berpindah.
   */
  useEffect(() => {
    let cancelled = false;

    const loadPageOpeningBalance = async () => {
      if (
        !selectedAccountId ||
        !startDate ||
        !endDate ||
        startDate > endDate
      ) {
        setPageOpeningBalance(0);
        setPageOpeningLoading(false);
        return;
      }

      if (page <= 1) {
        setPageOpeningBalance(openingBalance);
        setPageOpeningLoading(false);
        return;
      }

      setPageOpeningLoading(true);

      const rowsNeeded = (page - 1) * pageSize;
      const FETCH_SIZE = 1000;
      let offset = 0;
      let balance = openingBalance;

      try {
        while (offset < rowsNeeded) {
          const remaining = rowsNeeded - offset;
          const rangeSize = Math.min(FETCH_SIZE, remaining);

          let query = supabase
            .from("journals")
            .select(
              `
                id,
                tanggal,
                waktu,
                entity_id,
                journal_details!inner (
                  id,
                  debit,
                  credit
                )
              `,
            )
            .eq("journal_details.account_id", selectedAccountId)
            .gte("tanggal", startDate)
            .lte("tanggal", endDate)
            .order("tanggal", { ascending: true })
            .order("waktu", { ascending: true })
            .order("id", { ascending: true })
            .range(offset, offset + rangeSize - 1);

          if (selectedEntityId) {
            query = query.eq("entity_id", selectedEntityId);
          }

          const { data, error: pageOpeningError } = await query;

          if (pageOpeningError) {
            throw pageOpeningError;
          }

          const rows = (data ?? []) as Array<{
            journal_details?: Array<{
              debit: number | null;
              credit: number | null;
            }>;
          }>;

          for (const journal of rows) {
            for (const detail of journal.journal_details ?? []) {
              balance += getBalanceChangeForAccount(
                detail.debit,
                detail.credit,
                selectedAccountId,
                accounts,
              );
            }
          }

          if (rows.length < rangeSize) {
            break;
          }

          offset += rows.length;
        }

        if (!cancelled) {
          setPageOpeningBalance(balance);
          setPageOpeningLoading(false);
        }
      } catch (pageOpeningError) {
        console.error("Gagal menghitung saldo awal halaman:", pageOpeningError);

        if (!cancelled) {
          setPageOpeningBalance(openingBalance);
          setPageOpeningLoading(false);
          setError(
            pageOpeningError instanceof Error
              ? `Gagal menghitung saldo awal halaman: ${pageOpeningError.message}`
              : "Gagal menghitung saldo awal halaman.",
          );
        }
      }
    };

    void loadPageOpeningBalance();

    return () => {
      cancelled = true;
    };
  }, [
    selectedAccountId,
    selectedEntityId,
    startDate,
    endDate,
    page,
    pageSize,
    openingBalance,
    accounts,
  ]);

  const ledger = useMemo(() => {
    if (!selectedAccountId || startDate > endDate) {
      return {
        openingBalance: 0,
        entries: [] as LedgerEntry[],
        totalDebit: 0,
        totalCredit: 0,
      };
    }

    let runningBalance = pageOpeningBalance;

    const allEntries = journals
      .flatMap((journal) =>
        (journal.journal_details ?? []).map((detail) => ({
          id: detail.id,
          tanggal: journal.tanggal,
          waktu: journal.waktu,
          reference: journal.reference,
          description: detail.description || journal.description || "-",
          debit: Number(detail.debit ?? 0),
          credit: Number(detail.credit ?? 0),
        })),
      )
      .sort((a, b) => {
        const first = `${a.tanggal} ${a.waktu ?? "00:00:00"}`;

        const second = `${b.tanggal} ${b.waktu ?? "00:00:00"}`;

        return first.localeCompare(second);
      });

    const entries = allEntries.map((entry) => {
      runningBalance += getBalanceChange(entry.debit, entry.credit);

      return {
        ...entry,
        balance: runningBalance,
      };
    });

    return {
      openingBalance: pageOpeningBalance,
      entries,
      totalDebit: entries.reduce(
        (totalValue, entry) => totalValue + entry.debit,
        0,
      ),
      totalCredit: entries.reduce(
        (totalValue, entry) => totalValue + entry.credit,
        0,
      ),
    };
  }, [
    journals,
    normalBalance,
    selectedAccountId,
    startDate,
    endDate,
    openingBalance,
    pageOpeningBalance,
  ]);

  const formatBalance = (value: number) => {
    if (value === 0) {
      return "";
    }

    return formatCurrency(value);
  };

  const endingBalance =
    ledger.openingBalance +
    ledger.totalDebit * (normalBalance === "D" ? 1 : -1) +
    ledger.totalCredit * (normalBalance === "D" ? -1 : 1);

  const fetchAllFilteredLedgerEntries = async (): Promise<LedgerEntry[]> => {
    if (!selectedAccountId || !startDate || !endDate || startDate > endDate) {
      return [];
    }

    const PAGE_SIZE = 1000;
    let offset = 0;
    const allEntries: LedgerEntry[] = [];

    while (true) {
      let query = supabase
        .from("journals")
        .select(
          `
            id,
            tanggal,
            waktu,
            reference,
            description,
            entity_id,
            journal_details!inner (
              id,
              debit,
              credit,
              description
            )
          `,
        )
        .eq("journal_details.account_id", selectedAccountId)
        .gte("tanggal", startDate)
        .lte("tanggal", endDate)
        .order("tanggal", {
          ascending: true,
        })
        .order("waktu", {
          ascending: true,
        })
        .order("id", {
          ascending: true,
        })
        .range(offset, offset + PAGE_SIZE - 1);

      if (selectedEntityId) {
        query = query.eq("entity_id", selectedEntityId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      const rows = (data ?? []) as Journal[];

      for (const journal of rows) {
        for (const detail of journal.journal_details ?? []) {
          allEntries.push({
            id: detail.id,
            tanggal: journal.tanggal,
            waktu: journal.waktu,
            reference: journal.reference,
            description: detail.description || journal.description || "-",
            debit: Number(detail.debit ?? 0),
            credit: Number(detail.credit ?? 0),
            balance: 0,
          });
        }
      }

      if (rows.length < PAGE_SIZE) {
        break;
      }

      offset += PAGE_SIZE;
    }

    allEntries.sort((a, b) => {
      const first = `${a.tanggal} ${a.waktu ?? "00:00:00"}`;

      const second = `${b.tanggal} ${b.waktu ?? "00:00:00"}`;

      return first.localeCompare(second);
    });

    let runningBalance = openingBalance;

    return allEntries.map((entry) => {
      runningBalance += getBalanceChange(entry.debit, entry.credit);

      return {
        ...entry,
        balance: runningBalance,
      };
    });
  };

  const handleOpenJournalDetail = async (journalId: string) => {
    if (!journalId) return;

    setDetailLoading(true);
    setDetailError(null);
    setDetailJournal(null);
    setDetailUserName("");

    try {
      const { data: journal, error: journalError } = await supabase
        .from("journals")
        .select(`
          id,
          tanggal,
          waktu,
          reference,
          description,
          entity_id,
          user_id
        `)
        .eq("id", journalId)
        .single();

      if (journalError) throw journalError;

      const { data: details, error: detailsError } = await supabase
        .from("journal_details")
        .select(`
          id,
          debit,
          credit,
          description,
          account_id,
          account:accounts (
            code,
            name
          )
        `)
        .eq("journal_id", journalId)
        .order("id", { ascending: true });

      if (detailsError) throw detailsError;

      const normalizedDetails: JournalDetail[] = (details ?? []).map((detail) => ({
        id: detail.id,
        debit: detail.debit,
        credit: detail.credit,
        description: detail.description,
        account_id: detail.account_id,
        account: Array.isArray(detail.account)
          ? (detail.account[0] ?? null)
          : detail.account ?? null,
      }));

      setDetailJournal({
        id: journal.id,
        tanggal: journal.tanggal,
        waktu: journal.waktu,
        reference: journal.reference,
        description: journal.description,
        entity_id: journal.entity_id,
        user_id: journal.user_id,
        journal_details: normalizedDetails,
      });

      if (journal.user_id) {
        const { data: user } = await supabase
          .from("custom_users")
          .select("name")
          .eq("user_id", journal.user_id)
          .maybeSingle();

        setDetailUserName(user?.name ?? "");
      }
    } catch (journalDetailError) {
      console.error("Gagal memuat detail jurnal:", journalDetailError);
      setDetailError(
        journalDetailError instanceof Error
          ? journalDetailError.message
          : "Gagal memuat detail jurnal.",
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseJournalDetail = () => {
    setDetailJournal(null);
    setDetailUserName("");
    setDetailError(null);
  };

  const handleExportExcel = async () => {
    try {
      const rows = await fetchAllFilteredLedgerEntries();

      const accountName = selectedAccount
        ? `${selectedAccount.code} - ${selectedAccount.name}`
        : "Buku Besar";

      const exportTotalDebit = rows.reduce(
        (totalValue, row) => totalValue + row.debit,
        0,
      );
      const exportTotalCredit = rows.reduce(
        (totalValue, row) => totalValue + row.credit,
        0,
      );
      const exportEndingBalance =
        openingBalance +
        exportTotalDebit * (normalBalance === "D" ? 1 : -1) +
        exportTotalCredit * (normalBalance === "D" ? -1 : 1);

      const exportRows = [
        {
          tanggal: "",
          reference: "",
          description: `Saldo Awal - ${accountName}`,
          debit: 0,
          credit: 0,
          balance: openingBalance,
        },
        ...rows.map((row) => ({
          ...row,
          tanggal: formatDateIndonesia(row.tanggal),
        })),
        {
          tanggal: "",
          reference: "",
          description: "Saldo Akhir",
          debit: exportTotalDebit,
          credit: exportTotalCredit,
          balance: exportEndingBalance,
        },
      ];

      exportReport({
        filename: `General_Ledger_${formatReportDateRange(
          new Date(`${startDate}T00:00:00`),
          new Date(`${endDate}T00:00:00`),
        )}.xlsx`,

        sheetName: "General Ledger",

        columns: [
          {
            label: "Tanggal",
            key: "tanggal",
          },
          {
            label: "Referensi",
            key: "reference",
          },
          {
            label: "Keterangan",
            key: "description",
          },
          {
            label: "Debit",
            key: "debit",
            format: (value) =>
              Number(value ?? 0) ? formatCurrency(Number(value)) : "",
          },
          {
            label: "Kredit",
            key: "credit",
            format: (value) =>
              Number(value ?? 0) ? formatCurrency(Number(value)) : "",
          },
          {
            label: "Saldo",
            key: "balance",
            format: (value) => formatBalance(Number(value ?? 0)),
          },
        ],

        rows: exportRows,
      });
    } catch (error) {
      console.error("Export General Ledger gagal:", error);

      alert("Gagal melakukan export General Ledger.");
    }
  };

  const handlePrint = async () => {
    try {
      const rows = await fetchAllFilteredLedgerEntries();

      const accountName = selectedAccount
        ? `${selectedAccount.code} - ${selectedAccount.name}`
        : "Buku Besar";

      const printTotalDebit = rows.reduce(
        (totalValue, row) => totalValue + row.debit,
        0,
      );
      const printTotalCredit = rows.reduce(
        (totalValue, row) => totalValue + row.credit,
        0,
      );
      const printEndingBalance =
        openingBalance +
        printTotalDebit * (normalBalance === "D" ? 1 : -1) +
        printTotalCredit * (normalBalance === "D" ? -1 : 1);

      const printRows = [
        {
          tanggal: "",
          reference: "",
          description: `Saldo Awal - ${accountName}`,
          debit: 0,
          credit: 0,
          balance: openingBalance,
        },
        ...rows.map((row) => ({
          ...row,
          tanggal: formatDateIndonesia(row.tanggal),
        })),
        {
          tanggal: "",
          reference: "",
          description: "Saldo Akhir",
          debit: printTotalDebit,
          credit: printTotalCredit,
          balance: printEndingBalance,
        },
      ];

      const currentUser = getCustomUser();

      const printedBy = currentUser?.name || "-";

      printReport({
        title: "GENERAL LEDGER",

        period: `${formatReportDisplayDate(
          new Date(`${startDate}T00:00:00`),
        )} s/d ${formatReportDisplayDate(new Date(`${endDate}T00:00:00`))}`,

        orientation: "landscape",

        printedBy,

        columns: [
          {
            label: "Tanggal",
            key: "tanggal",
          },
          {
            label: "Referensi",
            key: "reference",
          },
          {
            label: "Keterangan",
            key: "description",
          },
          {
            label: "Debit",
            key: "debit",
            align: "right",
            format: (value) =>
              Number(value ?? 0) ? formatCurrency(Number(value)) : "",
          },
          {
            label: "Kredit",
            key: "credit",
            align: "right",
            format: (value) =>
              Number(value ?? 0) ? formatCurrency(Number(value)) : "",
          },
          {
            label: "Saldo",
            key: "balance",
            align: "right",
            format: (value) => formatBalance(Number(value ?? 0)),
          },
        ],

        rows: printRows,
      });
    } catch (error) {
      console.error("Print General Ledger gagal:", error);

      alert("Gagal mencetak General Ledger.");
    }
  };

  return (
    <div className="w-full pr-2 space-y-4">
      <div className="grid gap-4 rounded-md border border-gray-200 bg-white p-4 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Akun COA
          </label>

          <SearchableSelect
            value={selectedAccountId}
            onChange={setSelectedAccountId}
            disabled={masterLoading}
            placeholder="Pilih akun"
            clearLabel="Pilih akun"
            options={accounts.map((account) => ({
              value: account.id,
              label: `${account.code} - ${account.name}`,
              searchText: `${account.code} ${account.name}`,
            }))}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Cabang
          </label>

          <select
            value={selectedEntityId}
            onChange={(event) => setSelectedEntityId(event.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Semua Cabang</option>

            {entities.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.kode} - {entity.nama}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Dari Tanggal
          </label>

          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
            }}
            onClick={(e) => {
              const input = e.currentTarget as HTMLInputElement & {
                showPicker?: () => void;
              };
              input.showPicker?.();
            }}
            className="cursor-pointer w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Sampai Tanggal
          </label>

          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
            }}
            onClick={(e) => {
              const input = e.currentTarget as HTMLInputElement & {
                showPicker?: () => void;
              };
              input.showPicker?.();
            }}
            className="cursor-pointer w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 mb-4 py-4">
        <button
          type="button"
          onClick={handleExportExcel}
          disabled={loading || !selectedAccountId || startDate > endDate}
          className="bg-green-600 text-white px-3 py-1 rounded flex items-center gap-2"
        >
          Export Excel
        </button>

        <button
          type="button"
          onClick={handlePrint}
          disabled={loading || !selectedAccountId || startDate > endDate}
          className="bg-blue-600 text-white px-3 py-1 rounded flex items-center gap-2"
        >
          Cetak
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {startDate > endDate && (
        <div className="mt-4 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
          Tanggal awal tidak boleh melebihi tanggal akhir.
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="min-w-full text-sm leading-tight">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="px-4 py-2.5">Tanggal</th>
              <th className="px-4 py-2.5 text-left">Referensi</th>
              <th className="px-4 py-2.5 text-left">Keterangan</th>
              <th className="px-4 py-2.5 text-right">Debit</th>
              <th className="px-4 py-2.5 text-right">Kredit</th>
              <th className="px-4 py-2.5 text-right">Saldo</th>
            </tr>
          </thead>

          <tbody>
            {!loading && !pageOpeningLoading && selectedAccount && (
              <tr className="border-t bg-blue-50 font-medium text-gray-800">
                <td className="px-4 py-2" colSpan={5}>
                  Saldo Awal — {selectedAccount.code} - {selectedAccount.name}
                </td>

                <td className="px-4 py-2 text-right">
                  {formatBalance(ledger.openingBalance)}
                </td>
              </tr>
            )}

            {(loading || pageOpeningLoading) && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Memuat Buku Besar...
                </td>
              </tr>
            )}

            {!loading && !pageOpeningLoading && ledger.entries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Tidak ada mutasi pada periode ini.
                </td>
              </tr>
            )}

            {!loading &&
              !pageOpeningLoading &&
              ledger.entries.map((entry) => (
                <tr key={entry.id} className="border-t">
                  <td className="px-4 py-2">{formatDateIndonesia(entry.tanggal)}</td>

                  <td className="px-4 py-2 text-left">
                  {entry.reference ? (
                    <button
                      type="button"
                      onClick={() => {
                        const journal = journals.find((item) =>
                          (item.journal_details ?? []).some(
                            (detail) => detail.id === entry.id,
                          ),
                        );
                        if (journal) void handleOpenJournalDetail(journal.id);
                      }}
                      disabled={detailLoading}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline disabled:cursor-wait disabled:opacity-60"
                    >
                      {entry.reference}
                    </button>
                  ) : (
                    "-"
                  )}
                </td>

                  <td className="px-4 py-2 text-left">{entry.description}</td>

                  <td className="px-4 py-2 text-right">
                    {entry.debit ? formatCurrency(entry.debit) : ""}
                  </td>

                  <td className="px-4 py-2 text-right">
                    {entry.credit ? formatCurrency(entry.credit) : ""}
                  </td>

                  <td className="px-4 py-2 text-right font-medium">
                    {formatBalance(entry.balance)}
                  </td>
                </tr>
              ))}

            {!loading && !pageOpeningLoading && selectedAccount && (
              <tr className="border-t bg-gray-100 font-semibold">
                <td className="px-4 py-2" colSpan={3}>
                  Saldo Akhir
                </td>

                <td className="px-4 py-2 text-right">
                  {ledger.totalDebit ? formatCurrency(ledger.totalDebit) : ""}
                </td>

                <td className="px-4 py-2 text-right">
                  {ledger.totalCredit ? formatCurrency(ledger.totalCredit) : ""}
                </td>

                <td className="px-4 py-2 text-right">
                  {formatBalance(endingBalance)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {detailJournal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) handleCloseJournalDetail();
          }}
        >
          <div className="w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b bg-gray-50 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Detail Jurnal</h2>
                <p className="text-sm text-gray-500">
                  {detailJournal.description || "Rincian transaksi jurnal"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseJournalDetail}
                className="rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-800"
                aria-label="Tutup detail jurnal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-3 border-b px-5 py-4 md:grid-cols-4">
              <div>
                <div className="text-xs text-gray-500">Tanggal</div>
                <div className="font-medium text-gray-900">{formatDateIndonesia(detailJournal.tanggal)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">No. Referensi</div>
                <div className="font-medium text-gray-900">{detailJournal.reference || "-"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Tanggal & Jam</div>
                <div className="font-medium text-gray-900">
                  {formatDateIndonesia(detailJournal.tanggal)}{detailJournal.waktu ? ` ${detailJournal.waktu}` : ""}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Input Oleh</div>
                <div className="font-medium text-gray-900">
                  {detailUserName || detailJournal.user_id || "-"}
                </div>
              </div>
            </div>

            {detailLoading ? (
              <div className="px-5 py-10 text-center text-gray-500">Memuat detail jurnal...</div>
            ) : detailError ? (
              <div className="m-5 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                {detailError}
              </div>
            ) : (
              <div className="max-h-[55vh] overflow-auto px-5 py-4">
                <table className="min-w-full text-sm leading-tight">
                  <thead className="sticky top-0 bg-gray-100 text-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left">Kode Akun</th>
                      <th className="px-3 py-2 text-left">Nama Akun</th>
                      <th className="px-3 py-2 text-left">Keterangan</th>
                      <th className="px-3 py-2 text-right">Debit</th>
                      <th className="px-3 py-2 text-right">Kredit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailJournal.journal_details.map((detail) => (
                      <tr key={detail.id} className="border-t">
                        <td className="px-3 py-2 font-medium">{detail.account?.code || "-"}</td>
                        <td className="px-3 py-2">{detail.account?.name || "-"}</td>
                        <td className="px-3 py-2">{detail.description || "-"}</td>
                        <td className="px-3 py-2 text-right">
                          {Number(detail.debit ?? 0) ? formatCurrency(Number(detail.debit)) : ""}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {Number(detail.credit ?? 0) ? formatCurrency(Number(detail.credit)) : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 bg-gray-50 font-semibold">
                    <tr>
                      <td className="px-3 py-3" colSpan={3}>Total</td>
                      <td className="px-3 py-3 text-right">
                        {formatCurrency(detailJournal.journal_details.reduce((sum, detail) => sum + Number(detail.debit ?? 0), 0))}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {formatCurrency(detailJournal.journal_details.reduce((sum, detail) => sum + Number(detail.credit ?? 0), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            <div className="flex justify-end border-t bg-gray-50 px-5 py-3">
              <button
                type="button"
                onClick={handleCloseJournalDetail}
                className="rounded-md bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <Pagination
        meta={{
          page,
          pageSize,
          total,
          totalPages,
          from: total === 0 ? 0 : (page - 1) * pageSize,
          to: total === 0 ? 0 : Math.min(page * pageSize - 1, total - 1),
          hasPreviousPage: page > 1,
          hasNextPage: page < totalPages,
        }}
        onPageChange={setPage}
        onPageSizeChange={(newPageSize) => {
          setPageSize(newPageSize);
          setPage(1);
        }}
      />
    </div>
  );
}

/*
 * Helper untuk menghitung perubahan saldo
 * berdasarkan normal balance akun.
 */
function getBalanceChangeForAccount(
  debit: number | null,
  credit: number | null,
  accountId: string,
  accounts: Account[],
): number {
  const account = accounts.find((item) => item.id === accountId);

  const normalBalance = account?.normal_balance ?? "D";

  const debitValue = Number(debit ?? 0);

  const creditValue = Number(credit ?? 0);

  return normalBalance === "D"
    ? debitValue - creditValue
    : creditValue - debitValue;
}
