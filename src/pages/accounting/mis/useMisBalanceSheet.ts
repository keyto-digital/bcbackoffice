import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type MisBalanceSheetRow = {
  account_id: string | null;
  account_code: string;
  account_name: string;
  category_code:
    | "ASSET"
    | "LIABILITY"
    | "EQUITY"
    | "CURRENT_PROFIT"
    | string;
  amount: number;
};

type UseMisBalanceSheetParams = {
  entityId: string | null;
  asOfDate: string | null;
};

type UseMisBalanceSheetResult = {
  rows: MisBalanceSheetRow[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

export function useMisBalanceSheet({
  entityId,
  asOfDate,
}: UseMisBalanceSheetParams): UseMisBalanceSheetResult {
  const [rows, setRows] = useState<MisBalanceSheetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBalanceSheet = useCallback(async () => {
    if (!entityId || !asOfDate) {
      setRows([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "get_mis_balance_sheet",
        {
          p_entity_id: entityId,
          p_as_of_date: asOfDate,
        },
      );

      if (rpcError) {
        throw rpcError;
      }

      const mappedRows: MisBalanceSheetRow[] = (data ?? []).map(
        (row: {
          account_id: string | null;
          account_code: string;
          account_name: string;
          category_code: string;
          amount: number | string | null;
        }) => ({
          account_id: row.account_id ?? null,
          account_code: row.account_code,
          account_name: row.account_name,
          category_code: row.category_code,
          amount: Number(row.amount ?? 0),
        }),
      );

      setRows(mappedRows);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Gagal mengambil data Balance Sheet.";

      console.error("useMisBalanceSheet:", err);
      setRows([]);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [entityId, asOfDate]);

  useEffect(() => {
    void loadBalanceSheet();
  }, [loadBalanceSheet]);

  return {
    rows,
    loading,
    error,
    reload: loadBalanceSheet,
  };
}