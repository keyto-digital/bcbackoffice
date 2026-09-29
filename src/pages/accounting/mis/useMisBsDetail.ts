import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { MisBsDetailRow } from "./types";

type UseMisBsDetailResult = {
  rows: MisBsDetailRow[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

export function useMisBsDetail(
  entityId: string | null,
  year: number,
  month: number,
): UseMisBsDetailResult {
  const [rows, setRows] = useState<MisBsDetailRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!entityId) {
      setRows([]);
      setError(null);
      return;
    }

    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100 ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      setRows([]);
      setError("Periode MIS tidak valid.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase.rpc(
        "get_mis_bs_detail",
        {
          p_entity_id: entityId,
          p_year: year,
          p_month: month,
        },
      );

      if (fetchError) {
        throw fetchError;
      }

      const mappedRows: MisBsDetailRow[] = (
        data ?? []
      ).map(
        (row: {
          account_id: string;
          account_code: string;
          account_name: string;
          category_code: string;
          normal_balance: string;
          last_month: number | string | null;
          actual: number | string | null;
          variance: number | string | null;
        }) => ({
          account_id: row.account_id,
          account_code: row.account_code,
          account_name: row.account_name,
          category_code: row.category_code,
          normal_balance: row.normal_balance,
          last_month: Number(row.last_month ?? 0),
          actual: Number(row.actual ?? 0),
          variance: Number(row.variance ?? 0),
        }),
      );

      setRows(mappedRows);
    } catch (fetchError) {
      console.error("Gagal memuat MIS BS Detail:", fetchError);

      setRows([]);

      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Gagal memuat MIS BS Detail.",
      );
    } finally {
      setLoading(false);
    }
  }, [entityId, year, month]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return {
    rows,
    loading,
    error,
    reload: loadData,
  };
}