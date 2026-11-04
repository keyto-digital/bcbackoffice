
import { useEffect, useState } from "react";
import { AccountMappingForm } from "./components/AccountMappingForm";
import { AccountMappingTable } from "./components/AccountMappingTable";
import { useAccountMapping } from "./hooks/useAccountMapping";
import { useCoa } from "../coa/hooks/useCoa";
import Pagination from "@/components/common/Pagination";
import {
  getCustomAuthToken,
  getCustomUser,
} from "@/lib/authUser";
import type {
  AccountMappingFormData,
  AccountMappingWithAccount,
} from "./types";

interface AccountMappingPageProps {
  entityId?: string | null;
}

interface PeriodLockSettings {
  is_enabled: boolean;
  locked_through_date: string | null;
  updated_at?: string | null;
}

const AUTH_API_URL = (
  import.meta.env.VITE_AUTH_API_URL || "http://localhost:3001"
).replace(/\/+$/, "");

export function AccountMappingPage({
  entityId = null,
}: AccountMappingPageProps) {
  const {
    mappings,
    loading,
    saving,
    error,
    createMapping,
    updateMapping,
    deleteMapping,
    page,
    pageSize,
    total,
    totalPages,
    setPage,
    setPageSize,
    search,
    setSearch,
  } = useAccountMapping(entityId);

  const { accounts, loading: loadingAccounts } = useCoa(entityId);

  const [editingMapping, setEditingMapping] =
    useState<AccountMappingWithAccount | null>(null);

  // Hak akses khusus
  const user = getCustomUser();

  const canManagePeriodLock =
    Array.isArray(user?.access) &&
    user.access.includes("accounting.period_lock.manage");

  // Tab
  const [activeTab, setActiveTab] = useState<
    "mapping" | "settings"
  >("mapping");

  // Pengaturan periode
  const [periodSettings, setPeriodSettings] =
    useState<PeriodLockSettings>({
      is_enabled: false,
      locked_through_date: null,
    });

  const [loadingPeriodSettings, setLoadingPeriodSettings] =
    useState(false);

  const [savingPeriodSettings, setSavingPeriodSettings] =
    useState(false);

  const [periodError, setPeriodError] = useState<string | null>(
    null,
  );

  const [periodSuccess, setPeriodSuccess] = useState<string | null>(
    null,
  );

  // Memuat setting dari backend
  useEffect(() => {
    if (!canManagePeriodLock) return;

    const loadPeriodSettings = async () => {
      const token = getCustomAuthToken();

      if (!token) {
        setPeriodError("Sesi login tidak ditemukan. Silakan login ulang.");
        return;
      }

      setLoadingPeriodSettings(true);
      setPeriodError(null);

      try {
        const response = await fetch(
          `${AUTH_API_URL}/accounting/period-lock`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Gagal mengambil pengaturan periode.",
          );
        }

        setPeriodSettings({
          is_enabled: Boolean(result.data?.is_enabled),
          locked_through_date:
            result.data?.locked_through_date ?? null,
          updated_at: result.data?.updated_at ?? null,
        });
      } catch (err) {
        setPeriodError(
          err instanceof Error
            ? err.message
            : "Gagal mengambil pengaturan periode.",
        );
      } finally {
        setLoadingPeriodSettings(false);
      }
    };

    void loadPeriodSettings();
  }, [canManagePeriodLock]);

  const handleSubmit = async (payload: AccountMappingFormData) => {
    if (editingMapping) {
      const success = await updateMapping(
        editingMapping.id,
        payload,
      );

      if (success) {
        setEditingMapping(null);
      }

      return success;
    }

    return createMapping(payload);
  };

  const handleDelete = async (
    mapping: AccountMappingWithAccount,
  ) => {
    const confirmed = window.confirm(
      `Hapus mapping ${mapping.module_code} - ${
        mapping.mapping_key ?? mapping.name
      }?`,
    );

    if (!confirmed) return;

    await deleteMapping(mapping.id);
  };

  const handleSavePeriodSettings = async () => {
    const token = getCustomAuthToken();

    if (!token) {
      setPeriodError("Sesi login tidak ditemukan. Silakan login ulang.");
      return;
    }

    if (
      periodSettings.is_enabled &&
      !periodSettings.locked_through_date
    ) {
      setPeriodError(
        "Tanggal terakhir periode yang dikunci wajib diisi.",
      );
      return;
    }

    const confirmed = window.confirm(
      periodSettings.is_enabled
        ? `Aktifkan penguncian jurnal sampai ${periodSettings.locked_through_date}? Semua jurnal pada tanggal tersebut dan sebelumnya tidak dapat dibuat, diedit, atau dihapus.`
        : "Nonaktifkan penguncian periode akuntansi?",
    );

    if (!confirmed) return;

    setSavingPeriodSettings(true);
    setPeriodError(null);
    setPeriodSuccess(null);

    try {
      const response = await fetch(
        `${AUTH_API_URL}/accounting/period-lock`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            is_enabled: periodSettings.is_enabled,
            locked_through_date:
              periodSettings.locked_through_date,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal menyimpan pengaturan periode.",
        );
      }

      setPeriodSettings({
        is_enabled: Boolean(result.data?.is_enabled),
        locked_through_date:
          result.data?.locked_through_date ?? null,
        updated_at: result.data?.updated_at ?? null,
      });

      setPeriodSuccess(
        result.message || "Pengaturan berhasil disimpan.",
      );
    } catch (err) {
      setPeriodError(
        err instanceof Error
          ? err.message
          : "Gagal menyimpan pengaturan periode.",
      );
    } finally {
      setSavingPeriodSettings(false);
    }
  };

  return (
    <div className="w-full pr-2 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          Account Mapping ERP
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Hubungkan transaksi operasional dengan akun COA.
        </p>
      </div>

      {/* Tab */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab("mapping")}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            activeTab === "mapping"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          Account Mapping
        </button>

        {canManagePeriodLock && (
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === "settings"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            Setting Lain
          </button>
        )}
      </div>

      {/* TAB ACCOUNT MAPPING */}
      {activeTab === "mapping" && (
        <>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Kelola hubungan transaksi operasional dengan akun COA.
              </p>
            </div>

            <div className="w-full md:w-80">
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari module, transaksi, akun..."
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loadingAccounts && (
            <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Memuat daftar akun COA...
            </div>
          )}

          <AccountMappingForm
            accounts={accounts}
            initialValue={editingMapping}
            entityId={entityId}
            saving={saving}
            onSubmit={handleSubmit}
            onCancel={
              editingMapping
                ? () => setEditingMapping(null)
                : undefined
            }
          />

          <AccountMappingTable
            mappings={mappings}
            loading={loading}
            onEdit={setEditingMapping}
            onDelete={handleDelete}
          />

          <Pagination
            meta={{
              page,
              pageSize,
              total,
              totalPages,
              from: total === 0 ? 0 : (page - 1) * pageSize + 1,
              to: total === 0 ? 0 : Math.min(page * pageSize, total),
              hasPreviousPage: page > 1,
              hasNextPage: page < totalPages,
            }}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </>
      )}

      {/* TAB SETTING LAIN */}
      {activeTab === "settings" && canManagePeriodLock && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="font-semibold text-gray-900">
                Penguncian Periode Akuntansi
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Batasi pembuatan, perubahan, dan penghapusan jurnal
                pada periode yang sudah ditutup.
              </p>
            </div>

            <div className="p-5 space-y-5">
              {loadingPeriodSettings ? (
                <div className="text-sm text-gray-500">
                  Memuat pengaturan periode...
                </div>
              ) : (
                <>
                  {/* Status */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        Status Penguncian
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Jika aktif, seluruh entity mengikuti tanggal
                        penguncian yang sama.
                      </p>
                    </div>

                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={periodSettings.is_enabled}
                        onChange={(event) => {
                          setPeriodSettings((prev) => ({
                            ...prev,
                            is_enabled: event.target.checked,
                          }));
                        }}
                        className="h-4 w-4"
                      />
                      <span className="text-sm font-medium">
                        Aktifkan Penguncian
                      </span>
                    </label>
                  </div>

                  {/* Tanggal */}
                  <div className="max-w-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kunci Transaksi Sampai Tanggal
                    </label>

                    <input
                      type="date"
                      value={
                        periodSettings.locked_through_date ?? ""
                      }
                      onChange={(event) => {
                        setPeriodSettings((prev) => ({
                          ...prev,
                          locked_through_date:
                            event.target.value || null,
                        }));
                      }}
                      disabled={!periodSettings.is_enabled}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                    />

                    <p className="mt-2 text-xs text-gray-500">
                      Tanggal yang dipilih ikut terkunci. Contoh:
                      jika memilih 31 Oktober 2026, transaksi tanggal
                      31 Oktober 2026 dan sebelumnya akan ditolak.
                    </p>
                  </div>

                  {/* Status periode */}
                  <div
                    className={`rounded-md border px-4 py-3 ${
                      periodSettings.is_enabled
                        ? "border-amber-200 bg-amber-50"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <p className="text-sm font-medium">
                      {periodSettings.is_enabled
                        ? "Penguncian Periode Aktif"
                        : "Penguncian Periode Nonaktif"}
                    </p>

                    <p className="mt-1 text-xs text-gray-600">
                      {periodSettings.is_enabled
                        ? `Jurnal sampai tanggal ${
                            periodSettings.locked_through_date ?? "-"
                          } tidak dapat dibuat, diedit, atau dihapus.`
                        : "Belum ada pembatasan periode akuntansi."}
                    </p>
                  </div>
                </>
              )}

              {periodError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {periodError}
                </div>
              )}

              {periodSuccess && (
                <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {periodSuccess}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSavePeriodSettings}
                  disabled={
                    loadingPeriodSettings || savingPeriodSettings
                  }
                  className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingPeriodSettings
                    ? "Menyimpan..."
                    : "Simpan Pengaturan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountMappingPage;
