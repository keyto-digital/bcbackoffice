import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabaseClient";

import type { MisMacroRow } from "./types";

type RpcMisMacroRow = {
  account_id: string;
  account_code: string;
  account_name: string;
  category_code: string;
  division_code: string;

  jan: number | string | null;
  feb: number | string | null;
  mar: number | string | null;
  apr: number | string | null;
  may: number | string | null;
  jun: number | string | null;
  jul: number | string | null;
  aug: number | string | null;
  sep: number | string | null;
  oct: number | string | null;
  nov: number | string | null;
  december: number | string | null;

  last_month: number | string | null;
  actual: number | string | null;
  budget: number | string | null;
  last_year: number | string | null;
  ytd: number | string | null;
  ytd_budget: number | string | null;
  last_year_ytd: number | string | null;
};

function toNumber(
  value: number | string | null | undefined,
) {
  const number = Number(value ?? 0);

  return Number.isFinite(number)
    ? number
    : 0;
}

function mapRow(
  row: RpcMisMacroRow,
): MisMacroRow {
  return {
    account_id: row.account_id,
    account_code: row.account_code,
    account_name: row.account_name,
    category_code: row.category_code,
    division_code: row.division_code,

    jan: toNumber(row.jan),
    feb: toNumber(row.feb),
    mar: toNumber(row.mar),
    apr: toNumber(row.apr),
    may: toNumber(row.may),
    jun: toNumber(row.jun),
    jul: toNumber(row.jul),
    aug: toNumber(row.aug),
    sep: toNumber(row.sep),
    oct: toNumber(row.oct),
    nov: toNumber(row.nov),
    december: toNumber(row.december),

    last_month: toNumber(
      row.last_month,
    ),
    actual: toNumber(row.actual),
    budget: toNumber(row.budget),
    last_year: toNumber(row.last_year),
    ytd: toNumber(row.ytd),
    ytd_budget: toNumber(
      row.ytd_budget,
    ),
    last_year_ytd: toNumber(
      row.last_year_ytd,
    ),
  };
}

export function useMisMacro(
  entityId: string | null,
  year: number,
  month: number,
) {
  const [rows, setRows] =
    useState<MisMacroRow[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const load = useCallback(async () => {
    if (!entityId) {
      setRows([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } =
        await supabase.rpc(
          "get_mis_macro",
          {
            p_entity_id: entityId,
            p_year: year,
            p_month: month,
          },
        );

      if (rpcError) {
        throw rpcError;
      }

      const result =
        (data ?? []) as RpcMisMacroRow[];

      setRows(
        result.map(mapRow),
      );
    } catch (err) {
      console.error(
        "load MIS macro error:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat MACRO MIS.",
      );

      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [
    entityId,
    year,
    month,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    rows,
    loading,
    error,
    reload: load,
  };
}