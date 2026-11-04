import { Search } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { OpnameFilter } from "../types";
import type { StoreOption } from "../../types";

interface Props {
  filter: OpnameFilter;
  stores: StoreOption[];
  loading: boolean;
  onChange: Dispatch<SetStateAction<OpnameFilter>>;
  onSearch: () => void;
}

export default function OpnameFilter({
  filter,
  stores,
  loading,
  onChange,
  onSearch,
}: Props) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Tanggal Awal</label>
          <input
            type="date"
            value={filter.dateFrom}
            onChange={(e) =>
              onChange((prev) => ({ ...prev, dateFrom: e.target.value }))
            }
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Tanggal Akhir</label>
          <input
            type="date"
            value={filter.dateTo}
            onChange={(e) =>
              onChange((prev) => ({ ...prev, dateTo: e.target.value }))
            }
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Gudang</label>
          <select
            value={filter.storeId}
            onChange={(e) =>
              onChange((prev) => ({ ...prev, storeId: e.target.value }))
            }
            className="w-full rounded border px-3 py-2"
          >
            <option value="">Semua Gudang</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.code} - {store.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Pencarian</label>
          <input
            type="text"
            placeholder="No Opname / Artikel..."
            value={filter.keyword}
            onChange={(e) =>
              onChange((prev) => ({ ...prev, keyword: e.target.value }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) onSearch();
            }}
            className="w-full rounded border px-3 py-2"
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onSearch}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Search size={16} />
          {loading ? "Memuat..." : "Cari"}
        </button>
      </div>
    </div>
  );
}
