import { formatDateIndonesia } from "@/pages/procurement/utils/date";
import { getWIBTimestampFromUTC } from "@/utils/time";
import { money, quantity } from "../../../utils/format";
import type { OpnameDocument } from "../types";

interface Props {
  loading: boolean;
  hasSearched: boolean;
  documents: OpnameDocument[];
  onDetail: (row: OpnameDocument) => void;
  onEdit: (row: OpnameDocument) => void;
}

const gridClass =
  "grid min-w-[1900px] grid-cols-[55px_120px_180px_210px_260px_90px_115px_115px_115px_145px_220px_150px_170px_150px]";

export default function OpnameTable({
  loading,
  hasSearched,
  documents,
  onDetail,
  onEdit,
}: Props) {
  if (!hasSearched && !loading) {
    return (
      <div className="rounded border bg-white p-10 text-center text-gray-500">
        Pilih periode tanggal, lalu klik tombol <b>Cari</b> untuk menampilkan laporan Stock Opname.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded border bg-white p-6 text-center">
        Memuat data Stock Opname...
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="rounded border bg-white p-6 text-center text-gray-500">
        Tidak ada data Stock Opname untuk filter tersebut.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded border bg-white">
      <div className={`${gridClass} bg-slate-100 text-sm font-semibold`}>
        <div className="border-r border-b p-3 text-center">No</div>
        <div className="border-r border-b p-3">Tanggal</div>
        <div className="border-r border-b p-3">No Opname</div>
        <div className="border-r border-b p-3">Gudang</div>
        <div className="border-r border-b p-3">Artikel</div>
        <div className="border-r border-b p-3">Satuan</div>
        <div className="border-r border-b p-3 text-right">Qty Sistem</div>
        <div className="border-r border-b p-3 text-right">Qty Opname</div>
        <div className="border-r border-b p-3 text-right">Selisih</div>
        <div className="border-r border-b p-3 text-right">Nilai</div>
        <div className="border-r border-b p-3">Akun Biaya</div>
        <div className="border-r border-b p-3 text-center">User</div>
        <div className="border-r border-b p-3">Posting</div>
        <div className="border-b p-3 text-center">Aksi</div>
      </div>

      {documents.map((doc, index) => {
        const item = doc.reportItem;
        const difference = item?.difference ?? 0;

        return (
          <div
            key={`${doc.reference}-${item?.item_id ?? index}-${index}`}
            className={`${gridClass} text-sm hover:bg-slate-50`}
          >
            <div className="border-r border-b p-3 text-center">
              {(0 /* row numbering is supplied by current page index */) + index + 1}
            </div>
            <div className="border-r border-b p-3 whitespace-nowrap">
              {formatDateIndonesia(doc.movement_date) || "-"}
            </div>
            <div className="border-r border-b p-3 font-medium">{doc.reference}</div>
            <div className="border-r border-b p-3">
              {doc.store ? `${doc.store.code} - ${doc.store.name}` : "-"}
            </div>
            <div className="border-r border-b p-3">
              {item ? `${item.code} - ${item.name}` : "-"}
            </div>
            <div className="border-r border-b p-3">{item?.unit_code || "-"}</div>
            <div className="border-r border-b p-3 text-right">
              {item ? quantity(item.qtySystem) : "-"}
            </div>
            <div className="border-r border-b p-3 text-right">
              {item ? quantity(item.qtyOpname) : "-"}
            </div>
            <div
              className={`border-r border-b p-3 text-right font-semibold ${
                difference < 0 ? "text-red-600" : difference > 0 ? "text-green-600" : ""
              }`}
            >
              {item ? quantity(difference) : "-"}
            </div>
            <div className="border-r border-b p-3 text-right">
              {item ? money(item.value) : "-"}
            </div>
            <div className="border-r border-b p-3">
              {item?.account_code
                ? `${item.account_code} - ${item.account_name ?? ""}`
                : item?.account_name ?? "-"}
            </div>
            <div className="border-r border-b p-3 text-center">
              {doc.created_by ?? "-"}
            </div>
            <div className="border-r border-b p-3 whitespace-nowrap">
              {getWIBTimestampFromUTC(doc.created_at)}
            </div>
            <div className="border-b p-3 text-center">
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => onDetail(doc)}
                  className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
                >
                  Detail
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(doc)}
                  className="rounded bg-amber-500 px-3 py-1 text-white hover:bg-amber-600"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
