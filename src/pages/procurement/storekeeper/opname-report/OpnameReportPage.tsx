import { useState } from "react";
import {
  number as formatNumber,
  money,
} from "@/pages/procurement/utils/format";
import { formatDateIndonesia } from "@/pages/procurement/utils/date";
import { getCustomUser } from "@/lib/authUser";
import {
  exportReport,
  formatReportDateRange,
  formatReportDisplayDate,
} from "@/utils/exportReport";
import { printReport } from "@/utils/printReport";
import type { OpnameDocument } from "./types";
import OpnameFilter from "./components/OpnameFilter";
import OpnameTable from "./components/OpnameTable";
import OpnameDetailModal from "./components/OpnameDetailModal";
import OpnameEditModal from "./components/OpnameEditModal";
import { useOpnameList } from "./hooks/useOpnameList";
import Pagination from "@/components/common/Pagination";

export default function OpnameReportPage() {
  const {
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
    updateOpname,
  } = useOpnameList();

  const [detail, setDetail] = useState<OpnameDocument | null>(null);
  const [editRow, setEditRow] = useState<OpnameDocument | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const handleSaveEdit = async (payload: {
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
    setSavingEdit(true);
    try {
      await updateOpname(payload);
      setEditRow(null);
      window.alert("Stock Opname berhasil diperbarui.");
    } catch (error) {
      console.error("Update Stock Opname gagal:", error);
      window.alert(
        error instanceof Error ? error.message : "Gagal memperbarui Stock Opname.",
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const getReportRows = async () => {
    const rows = await fetchAllFilteredDocuments();
    return rows
      .filter((doc) => doc.reportItem)
      .map((doc) => {
        const item = doc.reportItem!;
        return {
          tanggal: formatDateIndonesia(doc.movement_date) || "-",
          reference: doc.reference,
          gudang: doc.store ? `${doc.store.code} - ${doc.store.name}` : "-",
          artikel: `${item.code} - ${item.name}`,
          satuan: item.unit_code || "-",
          qtySystem: item.qtySystem,
          qtyOpname: item.qtyOpname,
          selisih: item.difference,
          nilai: item.value,
          akunBiaya: item.account_code
            ? `${item.account_code} - ${item.account_name ?? ""}`
            : item.account_name ?? "-",
          user: doc.created_by ?? "-",
          posting: doc.created_at,
        };
      });
  };

  const handleExport = async () => {
    try {
      const rows = await getReportRows();
      exportReport({
        filename: `Stock_Opname_${formatReportDateRange(
          filter.dateFrom ? new Date(`${filter.dateFrom}T00:00:00`) : null,
          filter.dateTo ? new Date(`${filter.dateTo}T00:00:00`) : null,
        )}.xlsx`,
        sheetName: "Stock Opname",
        columns: [
          { label: "Tanggal", key: "tanggal" },
          { label: "No Opname", key: "reference" },
          { label: "Gudang", key: "gudang" },
          { label: "Artikel", key: "artikel" },
          { label: "Satuan", key: "satuan" },
          { label: "Qty Sistem", key: "qtySystem" },
          { label: "Qty Opname", key: "qtyOpname" },
          { label: "Selisih", key: "selisih" },
          {
            label: "Nilai",
            key: "nilai",
            format: (value) => formatNumber(Number(value ?? 0)),
          },
          { label: "Akun Biaya", key: "akunBiaya" },
          { label: "User", key: "user" },
          { label: "Posting", key: "posting" },
        ],
        rows,
      });
    } catch (error) {
      console.error("Export Stock Opname gagal:", error);
      window.alert("Gagal melakukan export Stock Opname.");
    }
  };

  const handlePrint = async () => {
    try {
      const rows = await getReportRows();
      const currentUser = getCustomUser();
      const printedBy = currentUser?.name || "-";

      printReport({
        title: "LAPORAN STOCK OPNAME",
        period:
          filter.dateFrom || filter.dateTo
            ? `${
                filter.dateFrom
                  ? formatReportDisplayDate(new Date(`${filter.dateFrom}T00:00:00`))
                  : "-"
              } s/d ${
                filter.dateTo
                  ? formatReportDisplayDate(new Date(`${filter.dateTo}T00:00:00`))
                  : "-"
              }`
            : "Semua Periode",
        printedBy,
        columns: [
          { label: "Tanggal", key: "tanggal" },
          { label: "No Opname", key: "reference" },
          { label: "Gudang", key: "gudang" },
          { label: "Artikel", key: "artikel" },
          { label: "Satuan", key: "satuan" },
          { label: "Qty Sistem", key: "qtySystem", align: "right" },
          { label: "Qty Opname", key: "qtyOpname", align: "right" },
          {
            label: "Selisih",
            key: "selisih",
            align: "right",
            format: (value) => formatNumber(Number(value ?? 0)),
          },
          {
            label: "Nilai",
            key: "nilai",
            align: "right",
            format: (value) => formatNumber(Number(value ?? 0)),
          },
          { label: "Akun Biaya", key: "akunBiaya" },
          { label: "User", key: "user" },
        ],
        rows,
        footer: [
          { label: "Jumlah Baris Artikel", value: rows.length },
          {
            label: "Total Selisih",
            value: formatNumber(rows.reduce((sum, row) => sum + Number(row.selisih || 0), 0)),
          },
          {
            label: "Total Nilai",
            value: money(rows.reduce((sum, row) => sum + Number(row.nilai || 0), 0)),
          },
        ],
      });
    } catch (error) {
      console.error("Print Stock Opname gagal:", error);
      window.alert("Gagal mencetak Stock Opname.");
    }
  };

  return (
    <div className="w-full space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Stock Opname</h1>
        <p className="text-sm text-gray-500">
          Laporan Stock Opname per artikel berdasarkan periode yang dipilih.
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-3 pr-8">
        <OpnameFilter
          filter={filter}
          stores={stores}
          loading={loading}
          onChange={setFilter}
          onSearch={() => void search()}
        />

        {hasSearched && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={loading}
              className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-60"
            >
              Export Excel
            </button>
            <button
              type="button"
              onClick={() => void handlePrint()}
              disabled={loading}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              Print
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto pr-8">
        <OpnameTable
          loading={loading}
          hasSearched={hasSearched}
          documents={documents}
          onDetail={setDetail}
          onEdit={setEditRow}
        />
      </div>

      {hasSearched && paginationMeta.total > 0 && (
        <div className="pr-8">
          <Pagination
            meta={paginationMeta}
            onPageChange={goToPage}
            onPageSizeChange={changePageSize}
          />
        </div>
      )}

      {editRow && (
        <OpnameEditModal
          document={editRow}
          accounts={accounts}
          saving={savingEdit}
          onClose={() => {
            if (!savingEdit) setEditRow(null);
          }}
          onSave={handleSaveEdit}
        />
      )}

      <OpnameDetailModal
        open={detail !== null}
        row={detail}
        onClose={() => setDetail(null)}
      />
    </div>
  );
}
