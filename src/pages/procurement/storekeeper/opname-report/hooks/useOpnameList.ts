import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { PaginationMeta } from "@/lib/pagination/types";
import type { OpnameDocument, OpnameFilter, OpnameItem } from "../types";
import type { StoreOption, AccountOption } from "../../types";
import { getCustomUser } from "@/lib/authUser";

const DEFAULT_PAGE_SIZE = 25;
const RPC_BATCH_SIZE = 500;

type OpnameRpcStore = {
  id: string;
  code: string;
  name: string;
};

type OpnameRpcItem = {
  item_id: string;
  code: string | null;
  name: string | null;
  unit_code: string | null;
  qtySystem: number | string | null;
  qtyOpname: number | string | null;
  difference: number | string | null;
  averageCost: number | string | null;
  value: number | string | null;
  offset_account_id: string | null;
  offset_account_code: string | null;
  offset_account_name: string | null;
};

type OpnameRpcRow = {
  id: string;
  reference: string;
  movement_date: string;
  created_at: string;
  created_by: string | null;
  store: OpnameRpcStore | null;
  items: OpnameRpcItem[] | null;
  total_difference: number | string | null;
  total_value: number | string | null;
  total_count: number | string | null;
};

function createEmptyPagination(pageSize: number): PaginationMeta {
  return {
    page: 1,
    pageSize,
    total: 0,
    from: 0,
    to: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  };
}

function normalizeItem(item: OpnameRpcItem): OpnameItem {
  return {
    item_id: item.item_id,
    code: item.code ?? "",
    name: item.name ?? "",
    unit_code: item.unit_code ?? null,
    qtySystem: Number(item.qtySystem ?? 0),
    qtyOpname: Number(item.qtyOpname ?? 0),
    difference: Number(Number(item.difference ?? 0).toFixed(4)),
    averageCost: Number(item.averageCost ?? 0),
    value: Number(Number(item.value ?? 0).toFixed(2)),
    account_id: item.offset_account_id ?? null,
    account_code: item.offset_account_code ?? null,
    account_name: item.offset_account_name ?? null,
  };
}

function normalizeDocument(row: OpnameRpcRow): OpnameDocument {
  return {
    id: row.id || row.reference,
    reference: row.reference,
    movement_date: row.movement_date,
    created_at: row.created_at,
    created_by: row.created_by,
    store: row.store,
    items: Array.isArray(row.items) ? row.items.map(normalizeItem) : [],
    totalDifference: Number(Number(row.total_difference ?? 0).toFixed(6)),
    totalValue: Number(row.total_value ?? 0),
  };
}

function flattenDocuments(docs: OpnameDocument[]): OpnameDocument[] {
  return docs.flatMap((doc) =>
    doc.items.map((item) => ({
      ...doc,
      // Satu baris laporan = satu artikel. Data dokumen lengkap tetap utuh.
      reportItem: item,
    })),
  );
}

export function useOpnameList() {
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<OpnameDocument[]>([]);
  const [allReportRows, setAllReportRows] = useState<OpnameDocument[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [filter, setFilter] = useState<OpnameFilter>({
    dateFrom: "",
    dateTo: "",
    storeId: "",
    keyword: "",
  });
  const [appliedFilter, setAppliedFilter] = useState<OpnameFilter | null>(null);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>(
    createEmptyPagination(DEFAULT_PAGE_SIZE),
  );

  useEffect(() => {
    let cancelled = false;
    const loadAccounts = async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("id,code,name")
        .eq("is_active", true)
        .eq("is_posting", true)
        .order("code", { ascending: true });

      if (cancelled) return;
      if (error) {
        console.error("Load accounts gagal:", error);
        return;
      }
      setAccounts((data ?? []) as AccountOption[]);
    };
    void loadAccounts();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadStores = async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id,code,name")
        .order("code", { ascending: true });

      if (cancelled) return;
      if (error) {
        console.error("Load stores gagal:", error);
        return;
      }
      setStores((data ?? []) as StoreOption[]);
    };
    void loadStores();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Mengambil seluruh dokumen untuk filter yang diminta.
   * RPC tetap memakai paginasi dokumen yang sudah ada; setelah itu hasil
   * di-flatten menjadi baris per item dan paginasi UI diterapkan ke baris item.
   */
  const loadAllDocuments = useCallback(async (currentFilter: OpnameFilter) => {
    const result: OpnameDocument[] = [];
    let page = 1;
    let expectedTotal = 0;

    while (true) {
      const { data, error } = await supabase.rpc("get_opname_documents", {
        p_date_from: currentFilter.dateFrom || null,
        p_date_to: currentFilter.dateTo || null,
        p_store_id: currentFilter.storeId || null,
        p_keyword: currentFilter.keyword.trim() || "",
        p_page: page,
        p_page_size: RPC_BATCH_SIZE,
      });

      if (error) throw error;

      const rows = (data ?? []) as OpnameRpcRow[];
      if (rows.length === 0) break;

      if (page === 1) {
        expectedTotal = Number(rows[0]?.total_count ?? 0);
      }

      result.push(...rows.map(normalizeDocument));

      if (result.length >= expectedTotal || rows.length < RPC_BATCH_SIZE) break;
      page += 1;
    }

    return result;
  }, []);

  const applyPage = useCallback(
    (allRows: OpnameDocument[], requestedPage: number, pageSize: number) => {
      const total = allRows.length;
      const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;
      const safePage =
        totalPages === 0
          ? 1
          : Math.min(Math.max(requestedPage, 1), totalPages);
      const startIndex = (safePage - 1) * pageSize;
      const pageRows = allRows.slice(startIndex, startIndex + pageSize);

      setDocuments(pageRows);
      setPaginationMeta({
        page: safePage,
        pageSize,
        total,
        // Pertahankan konvensi PaginationMeta yang dipakai hook lama: indeks 0-based.
        from: total === 0 ? 0 : startIndex,
        to: total === 0 ? 0 : startIndex + pageRows.length - 1,
        totalPages,
        hasPreviousPage: safePage > 1,
        hasNextPage: safePage < totalPages,
      });
    },
    [],
  );

  const search = useCallback(async () => {
    if (filter.dateFrom && filter.dateTo && filter.dateFrom > filter.dateTo) {
      window.alert("Tanggal awal tidak boleh lebih besar dari tanggal akhir.");
      return;
    }

    setLoading(true);
    try {
      const snapshot: OpnameFilter = { ...filter };
      const docs = await loadAllDocuments(snapshot);
      const itemRows = flattenDocuments(docs);

      setAllReportRows(itemRows);
      setAppliedFilter(snapshot);
      setHasSearched(true);
      applyPage(itemRows, 1, paginationMeta.pageSize);
    } catch (error) {
      console.error("Pencarian Stock Opname gagal:", error);
      setAllReportRows([]);
      setDocuments([]);
      setHasSearched(true);
      setPaginationMeta(createEmptyPagination(paginationMeta.pageSize));
      window.alert(
        error instanceof Error
          ? error.message
          : "Gagal memuat laporan Stock Opname.",
      );
    } finally {
      setLoading(false);
    }
  }, [filter, loadAllDocuments, applyPage, paginationMeta.pageSize]);

  const goToPage = useCallback(
    (nextPage: number) => {
      if (!hasSearched || loading) return;
      applyPage(allReportRows, nextPage, paginationMeta.pageSize);
    },
    [hasSearched, loading, applyPage, allReportRows, paginationMeta.pageSize],
  );

  const changePageSize = useCallback(
    (nextPageSize: number) => {
      if (!hasSearched || loading || nextPageSize <= 0) return;
      applyPage(allReportRows, 1, nextPageSize);
    },
    [hasSearched, loading, applyPage, allReportRows],
  );

  const fetchAllFilteredDocuments = useCallback(async (): Promise<OpnameDocument[]> => {
    if (!hasSearched) return [];
    // Data export/print mengikuti hasil pencarian terakhir, bukan filter yang
    // mungkin sedang diedit tetapi belum ditekan tombol Cari.
    return allReportRows;
  }, [hasSearched, allReportRows]);

  const reload = useCallback(async () => {
    if (!appliedFilter) return;
    setLoading(true);
    try {
      const docs = await loadAllDocuments(appliedFilter);
      const itemRows = flattenDocuments(docs);
      setAllReportRows(itemRows);
      applyPage(itemRows, paginationMeta.page, paginationMeta.pageSize);
    } catch (error) {
      console.error("Reload Stock Opname gagal:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [appliedFilter, loadAllDocuments, applyPage, paginationMeta.page, paginationMeta.pageSize]);

  const updateOpname = useCallback(
    async ({
      reference,
      movementDate,
      storeId,
      description,
      lines,
    }: {
      reference: string;
      movementDate: string;
      storeId: string;
      description?: string | null;
      lines: Array<{
        item_id: string;
        actual_quantity: number;
        offset_account_id: string;
      }>;
    }) => {
      const currentUser = getCustomUser();
      const entityId =
        typeof currentUser?.entity_id === "string" ? currentUser.entity_id : "";
      const userId = typeof currentUser?.id === "string" ? currentUser.id : "";

      if (!entityId) throw new Error("Entity user tidak ditemukan.");
      if (!userId) throw new Error("User aplikasi tidak ditemukan.");

      const { data, error } = await supabase.rpc(
        "update_inventory_opname_batch",
        {
          p_entity_id: entityId,
          p_reference: reference,
          p_adjustment_date: movementDate,
          p_store_id: storeId,
          p_lines: lines,
          p_description: description ?? null,
          p_user_id: userId,
        },
      );

      if (error) {
        console.error("update_inventory_opname_batch RPC error:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        throw new Error(
          error.message || error.details || error.hint ||
            "Gagal memperbarui Stock Opname.",
        );
      }

      await reload();
      return data;
    },
    [reload],
  );

  return {
    loading,
    documents,
    stores,
    accounts,
    filter,
    setFilter,
    paginationMeta,
    hasSearched,
    search,
    goToPage,
    changePageSize,
    fetchAllFilteredDocuments,
    reload,
    updateOpname,
  };
}
