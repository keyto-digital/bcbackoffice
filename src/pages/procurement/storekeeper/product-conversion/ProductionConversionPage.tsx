import { useMemo } from "react";
import DateInput from "@/components/common/DateInput";
import SearchableSelect, {
  type SearchableSelectOption,
} from "@/components/common/SearchableSelect";
import { money, quantity } from "../../utils/format";
import { useProductionConversion } from "./useProductionConversion";

export default function ProductionConversionPage(): JSX.Element {
  const {
    stores,
    items,
    stocks,
    canAccessAllStores,
    storeId,
    setStoreId,
    conversionDate,
    setConversionDate,
    outputItemId,
    setOutputItemId,
    outputQuantity,
    setOutputQuantity,
    lines,
    addLine,
    removeLine,
    updateLine,
    reference,
    setReference,
    description,
    setDescription,
    loadingMaster,
    loadingStock,
    posting,
    error,
    setError,
    stockMap,
    resetForm,
    postConversion,
  } = useProductionConversion();

  const storeOptions = useMemo<SearchableSelectOption[]>(
    () =>
      stores.map((store) => ({
        value: store.id,
        label: `${store.code} - ${store.name}`,
        searchText: `${store.code} ${store.name}`,
      })),
    [stores],
  );

  const itemOptions = useMemo<SearchableSelectOption[]>(
    () =>
      items.map((item) => ({
        value: item.id,
        label: `${item.code} - ${item.name}`,
        searchText: `${item.code} ${item.name}`,
      })),
    [items],
  );

  const stockOptions = useMemo<SearchableSelectOption[]>(
    () =>
      stocks.map((stock) => ({
        value: stock.id,
        label: `${stock.code} - ${stock.name}`,
        searchText: `${stock.code} ${stock.name}`,
      })),
    [stocks],
  );

  const outputItem = items.find((item) => item.id === outputItemId);
  const outputQty = Number(outputQuantity || 0);

  const ingredientValue = lines.reduce((sum, line) => {
    const stock = stockMap.get(line.item_id);
    return sum + (stock ? Number(line.quantity || 0) * stock.average_cost : 0);
  }, 0);

  const estimatedUnitCost =
    outputQty > 0 ? ingredientValue / outputQty : 0;

  const handleSubmit = async () => {
    try {
      await postConversion();
      window.alert("Konversi bahan berhasil diposting.");
      resetForm();
    } catch {
      // Error sudah ditampilkan pada halaman.
    }
  };

  return (
    <div className="w-full space-y-4 pr-2">
      <div>
        <h1 className="text-2xl font-bold">Konversi / Produksi Bahan</h1>
        <p className="mt-1 text-sm text-gray-500">
          Mengubah beberapa bahan baku menjadi artikel hasil produksi pada Store
          yang sama.
        </p>
      </div>

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="font-medium"
          >
            Tutup
          </button>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Store / Gudang</label>
            <SearchableSelect
              value={storeId}
              options={storeOptions}
              placeholder={
                loadingMaster
                  ? "Memuat store..."
                  : canAccessAllStores
                    ? "Pilih store"
                    : "Store user"
              }
              emptyMessage="Store tidak ditemukan."
              disabled={!canAccessAllStores}
              onChange={setStoreId}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Tanggal Produksi</label>
            <DateInput value={conversionDate} onChange={setConversionDate} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">No. Referensi</label>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Contoh: PROD-260924-001"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Keterangan</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Produksi Premix A"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Hasil Konversi</h2>
          <p className="mt-1 text-sm text-gray-500">
            Artikel ini akan bertambah sebagai stok setelah transaksi diposting.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-[minmax(0,1fr)_180px_180px]">
          <div>
            <label className="mb-1 block text-sm font-medium">Artikel Hasil</label>
            <SearchableSelect
              value={outputItemId}
              options={itemOptions}
              placeholder={loadingMaster ? "Memuat artikel..." : "Pilih artikel hasil"}
              emptyMessage="Artikel tidak ditemukan."
              onChange={setOutputItemId}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Qty Hasil</label>
            <input
              type="number"
              min="0"
              step="0.0001"
              value={outputQuantity}
              onChange={(e) => setOutputQuantity(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="0"
            />
          </div>

          <div className="rounded-md border bg-gray-50 px-3 py-2">
            <div className="text-xs text-gray-500">Estimasi HPP / unit</div>
            <div className="mt-1 font-semibold">
              {money(estimatedUnitCost)}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {outputItem?.unit_code ?? "-"}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-semibold">Bahan Baku</h2>
            <p className="mt-1 text-sm text-gray-500">
              Stok akan dikurangi sesuai qty yang dimasukkan.
            </p>
          </div>
          <button
            type="button"
            onClick={addLine}
            disabled={!storeId}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Tambah Bahan
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="border-b px-3 py-3 text-left">No</th>
                <th className="border-b px-3 py-3 text-left">Bahan Baku</th>
                <th className="border-b px-3 py-3 text-left">Satuan</th>
                <th className="border-b px-3 py-3 text-right">Stok Tersedia</th>
                <th className="border-b px-3 py-3 text-right">Qty Digunakan</th>
                <th className="border-b px-3 py-3 text-right">HPP</th>
                <th className="border-b px-3 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => {
                const stock = stockMap.get(line.item_id);
                const qty = Number(line.quantity || 0);
                const value = stock ? qty * stock.average_cost : 0;

                return (
                  <tr key={line.id} className="hover:bg-gray-50">
                    <td className="border-b px-3 py-2 text-center">{index + 1}</td>
                    <td className="border-b px-3 py-2">
                      <SearchableSelect
                        value={line.item_id}
                        options={stockOptions}
                        placeholder={
                          loadingStock ? "Memuat stok..." : "Pilih bahan baku"
                        }
                        emptyMessage="Bahan baku tidak ditemukan."
                        onChange={(value) =>
                          updateLine(line.id, "item_id", value)
                        }
                      />
                    </td>
                    <td className="border-b px-3 py-2">{stock?.unit_code ?? "-"}</td>
                    <td className="border-b px-3 py-2 text-right">
                      {stock ? quantity(stock.quantity_on_hand) : "-"}
                    </td>
                    <td className="border-b px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.0001"
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(line.id, "quantity", e.target.value)
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-right"
                        placeholder="0"
                      />
                    </td>
                    <td className="border-b px-3 py-2 text-right">
                      {money(value)}
                    </td>
                    <td className="border-b px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        className="rounded border border-red-300 px-2 py-1 text-red-600 hover:bg-red-50"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={5} className="px-3 py-3 text-right font-medium">
                  Total Nilai Bahan
                </td>
                <td className="px-3 py-3 text-right font-semibold">
                  {money(ingredientValue)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={resetForm}
          disabled={posting}
          className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={
            posting ||
            loadingMaster ||
            loadingStock ||
            !storeId ||
            !outputItemId ||
            !outputQuantity
          }
          className="rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {posting ? "Memposting..." : "Simpan & Posting Konversi"}
        </button>
      </div>
    </div>
  );
}
