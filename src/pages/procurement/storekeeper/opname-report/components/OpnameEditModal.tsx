import SearchableSelect from "@/components/common/SearchableSelect";
import type { SearchableSelectOption } from "@/components/common/SearchableSelect";
import { useEffect, useMemo, useState } from "react";
import { X, Save } from "lucide-react";

import type { OpnameDocument } from "../types";

type AccountOption = {
  id: string;
  code: string;
  name: string;
};

type EditLine = {
  item_id: string;
  code: string;
  name: string;
  unit_code: string | null;
  qtySystem: number;
  actual_quantity: string;
  offset_account_id: string;
};

type OpnameEditModalProps = {
  document: OpnameDocument;
  accounts: AccountOption[];
  saving?: boolean;
  onClose: () => void;
  onSave: (payload: {
    reference: string;
    movementDate: string;
    storeId: string;
    description?: string | null;
    lines: Array<{
      item_id: string;
      actual_quantity: number;
      offset_account_id: string;
    }>;
  }) => Promise<void>;
};

export default function OpnameEditModal({
  document,
  accounts,
  saving = false,
  onClose,
  onSave,
}: OpnameEditModalProps) {
  const [movementDate, setMovementDate] = useState(
    document.movement_date,
  );

  const [lines, setLines] = useState<EditLine[]>(() =>
    document.items.map((item) => ({
      item_id: item.item_id,
      code: item.code,
      name: item.name,
      unit_code: item.unit_code,
      qtySystem: item.qtySystem,
      actual_quantity: String(item.qtyOpname),
      offset_account_id: item.account_id ?? "",
    })),
  );

  useEffect(() => {
    setMovementDate(document.movement_date);

    setLines(
      document.items.map((item) => ({
        item_id: item.item_id,
        code: item.code,
        name: item.name,
        unit_code: item.unit_code,
        qtySystem: item.qtySystem,
        actual_quantity: String(item.qtyOpname),
        offset_account_id: item.account_id ?? "",
      })),
    );
  }, [document]);

  const totalDifference = useMemo(
    () =>
      lines.reduce(
        (sum, line) =>
          sum +
          (Number(line.actual_quantity) || 0) -
          line.qtySystem,
        0,
      ),
    [lines],
  );

  const handleQtyChange = (
    itemId: string,
    value: string,
  ) => {
    setLines((current) =>
      current.map((line) =>
        line.item_id === itemId
          ? {
              ...line,
              actual_quantity: value,
            }
          : line,
      ),
    );
  };

  const accountOptions = useMemo<SearchableSelectOption[]>(
    () =>
      accounts.map((account) => ({
        value: account.id,
        label: `${account.code} - ${account.name}`,
        searchText: `${account.code} ${account.name}`,
      })),
    [accounts],
  );

  const handleAccountChange = (
    itemId: string,
    accountId: string,
  ) => {
    setLines((current) =>
      current.map((line) =>
        line.item_id === itemId
          ? {
              ...line,
              offset_account_id: accountId,
            }
          : line,
      ),
    );
  };

  const handleSubmit = async () => {
    if (!movementDate) {
      window.alert("Tanggal transaksi wajib diisi.");
      return;
    }

    if (!document.store?.id) {
      window.alert("Store opname tidak ditemukan.");
      return;
    }

    const payloadLines = lines.map((line, index) => {
      const quantity = Number(line.actual_quantity);

      if (!Number.isFinite(quantity) || quantity < 0) {
        throw new Error(
          `Qty opname pada baris ${index + 1} tidak valid.`,
        );
      }

      if (!line.offset_account_id) {
        throw new Error(
          `Pilih akun selisih pada baris ${index + 1}.`,
        );
      }

      return {
        item_id: line.item_id,
        actual_quantity: quantity,
        offset_account_id: line.offset_account_id,
      };
    });

    await onSave({
      reference: document.reference,
      movementDate,
      storeId: document.store.id,
      description: "Stock Opname",
      lines: payloadLines,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">
              Edit Stock Opname
            </h2>

            <p className="text-sm text-gray-500">
              {document.reference}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-auto p-5">
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">
                No Opname
              </label>

              <input
                value={document.reference}
                disabled
                className="w-full rounded-lg border bg-gray-100 px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Tanggal Transaksi
              </label>

              <input
                type="date"
                value={movementDate}
                onChange={(event) =>
                  setMovementDate(event.target.value)
                }
                disabled={saving}
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Store
              </label>

              <input
                value={
                  document.store
                    ? `${document.store.code} - ${document.store.name}`
                    : ""
                }
                disabled
                className="w-full rounded-lg border bg-gray-100 px-3 py-2"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">
                    Artikel
                  </th>

                  <th className="px-3 py-2 text-right">
                    Qty Sistem
                  </th>

                  <th className="px-3 py-2 text-right">
                    Qty Opname
                  </th>

                  <th className="px-3 py-2 text-right">
                    Selisih
                  </th>

                  <th className="px-3 py-2 text-left">
                    Akun Selisih
                  </th>
                </tr>
              </thead>

              <tbody>
                {lines.map((line) => {
                  const difference =
                    (Number(line.actual_quantity) || 0) -
                    line.qtySystem;

                  return (
                    <tr
                      key={line.item_id}
                      className="border-t"
                    >
                      <td className="px-3 py-2">
                        <div className="font-medium">
                          {line.code}
                        </div>

                        <div className="text-xs text-gray-500">
                          {line.name}
                        </div>
                      </td>

                      <td className="px-3 py-2 text-right">
                        {line.qtySystem}
                      </td>

                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={line.actual_quantity}
                          onChange={(event) =>
                            handleQtyChange(
                              line.item_id,
                              event.target.value,
                            )
                          }
                          disabled={saving}
                          className="w-full rounded-lg border px-3 py-2 text-right"
                        />
                      </td>

                      <td className="px-3 py-2 text-right font-medium">
                        {difference}
                      </td>

                      <td className="px-3 py-2">
                        <SearchableSelect
                          value={line.offset_account_id}
                          options={accountOptions}
                          placeholder="Pilih akun..."
                          clearLabel="-- PILIH AKUN --"
                          emptyMessage="Akun tidak ditemukan."
                          disabled={saving}
                          onChange={(accountId) =>
                            handleAccountChange(
                              line.item_id,
                              accountId,
                            )
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot>
                <tr className="border-t bg-gray-50 font-semibold">
                  <td
                    colSpan={3}
                    className="px-3 py-3 text-right"
                  >
                    Total Selisih
                  </td>

                  <td className="px-3 py-3 text-right">
                    {totalDifference}
                  </td>

                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border px-4 py-2"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={() => {
              void handleSubmit().catch((error) => {
                console.error(
                  "Update Stock Opname gagal:",
                  error,
                );

                window.alert(
                  error instanceof Error
                    ? error.message
                    : "Gagal memperbarui Stock Opname.",
                );
              });
            }}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
            <Save size={17} />

            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}