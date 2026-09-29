import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabaseClient";

import type {
  MisBudgetAccount,
  MisBudgetRow,
} from "./types";

const MONTHS = 12;

export function useMisBudget(
  entityId: string | null,
  budgetYear: number,
) {
  const [accounts, setAccounts] = useState<MisBudgetAccount[]>([]);
  const [rows, setRows] = useState<MisBudgetRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!entityId) {
      setAccounts([]);
      setRows([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [
        accountsResult,
        budgetsResult,
      ] = await Promise.all([
        supabase
          .from("accounts")
          .select(
            "id, code, name, category_code",
          )
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

        supabase
          .from("mis_budgets")
          .select(
            "account_id, budget_month, amount",
          )
          .eq("entity_id", entityId)
          .eq("budget_year", budgetYear),
      ]);

      if (accountsResult.error) {
        throw accountsResult.error;
      }

      if (budgetsResult.error) {
        throw budgetsResult.error;
      }

      const accountData =
        accountsResult.data ?? [];

      const budgetData =
        budgetsResult.data ?? [];

      setAccounts(accountData);

      const budgetMap = new Map<
        string,
        number[]
      >();

      for (const account of accountData) {
        budgetMap.set(
          account.id,
          Array(MONTHS).fill(0),
        );
      }

      for (const budget of budgetData) {
        const months =
          budgetMap.get(budget.account_id);

        if (!months) continue;

        const monthIndex =
          Number(budget.budget_month) - 1;

        if (
          monthIndex >= 0 &&
          monthIndex < MONTHS
        ) {
          months[monthIndex] =
            Number(budget.amount ?? 0);
        }
      }

      setRows(
        accountData.map((account) => ({
          account_id: account.id,
          account_code: account.code,
          account_name: account.name,
          category_code:
            account.category_code,
          months:
            budgetMap.get(account.id) ??
            Array(MONTHS).fill(0),
        })),
      );
    } catch (err) {
      console.error(
        "load MIS budget error:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat budget MIS.",
      );
    } finally {
      setLoading(false);
    }
  }, [entityId, budgetYear]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateMonth = useCallback(
    (
      accountId: string,
      monthIndex: number,
      value: number,
    ) => {
      setRows((current) =>
        current.map((row) => {
          if (
            row.account_id !== accountId
          ) {
            return row;
          }

          const months = [
            ...row.months,
          ];

          months[monthIndex] =
            Number.isFinite(value)
              ? value
              : 0;

          return {
            ...row,
            months,
          };
        }),
      );
    },
    [],
  );

  const saveRow = useCallback(
    async (row: MisBudgetRow) => {
      if (!entityId) {
        throw new Error(
          "Entity belum dipilih.",
        );
      }

      setSaving(true);
      setError(null);

      try {
        const { error: rpcError } =
          await supabase.rpc(
            "save_mis_budget",
            {
              p_entity_id: entityId,
              p_account_id:
                row.account_id,
              p_budget_year:
                budgetYear,
              p_amounts: row.months,
            },
          );

        if (rpcError) {
          throw rpcError;
        }
      } catch (err) {
        console.error(
          "save MIS budget error:",
          err,
        );

        const message =
          err instanceof Error
            ? err.message
            : "Gagal menyimpan budget MIS.";

        setError(message);

        throw err;
      } finally {
        setSaving(false);
      }
    },
    [entityId, budgetYear],
  );

  const saveAll = useCallback(
    async () => {
      if (!entityId) {
        throw new Error(
          "Entity belum dipilih.",
        );
      }

      setSaving(true);
      setError(null);

      try {
        for (const row of rows) {
          const { error: rpcError } =
            await supabase.rpc(
              "save_mis_budget",
              {
                p_entity_id: entityId,
                p_account_id:
                  row.account_id,
                p_budget_year:
                  budgetYear,
                p_amounts: row.months,
              },
            );

          if (rpcError) {
            throw rpcError;
          }
        }
      } catch (err) {
        console.error(
          "save all MIS budget error:",
          err,
        );

        const message =
          err instanceof Error
            ? err.message
            : "Gagal menyimpan budget MIS.";

        setError(message);

        throw err;
      } finally {
        setSaving(false);
      }
    },
    [entityId, budgetYear, rows],
  );

  return {
    accounts,
    rows,
    loading,
    saving,
    error,

    updateMonth,
    saveRow,
    saveAll,
    reload: load,
  };
}