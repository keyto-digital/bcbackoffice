import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getCustomUser } from "@/lib/authUser";
import { getDefaultStoreId, hasAllStoresAccess } from "@/lib/storeAccess";
import { inputDate } from "../../utils/date";

export type ConversionItem = {
  id: string;
  code: string;
  name: string;
  unit_code: string;
  item_type: string | null;
};

export type ConversionStore = {
  id: string;
  code: string;
  name: string;
};

export type ConversionStock = ConversionItem & {
  stock_id: string;
  store_id: string;
  quantity_on_hand: number;
  average_cost: number;
  stock_value: number;
};

export type ConversionLine = {
  id: string;
  item_id: string;
  quantity: string;
};

const localId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `line-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const emptyLine = (): ConversionLine => ({
  id: localId(),
  item_id: "",
  quantity: "",
});

export function useProductionConversion() {
  const currentUser = getCustomUser();
  const entityId = currentUser?.entity_id ?? null;
  const userId = currentUser?.id ?? "";
  const canAccessAllStores = hasAllStoresAccess();
  const defaultStoreId = getDefaultStoreId();

  const [stores, setStores] = useState<ConversionStore[]>([]);
  const [items, setItems] = useState<ConversionItem[]>([]);
  const [stocks, setStocks] = useState<ConversionStock[]>([]);

  const [storeId, setStoreId] = useState(
    canAccessAllStores ? "" : defaultStoreId ?? "",
  );
  const [conversionDate, setConversionDate] = useState(inputDate(new Date()));
  const [outputItemId, setOutputItemId] = useState("");
  const [outputQuantity, setOutputQuantity] = useState("");
  const [lines, setLines] = useState<ConversionLine[]>([emptyLine()]);
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");

  const [loadingMaster, setLoadingMaster] = useState(false);
  const [loadingStock, setLoadingStock] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMaster = useCallback(async () => {
    setLoadingMaster(true);
    setError(null);

    try {
      let storeQuery = supabase
        .from("stores")
        .select("id,code,name")
        .eq("is_active", true)
        .order("code");

      if (!canAccessAllStores && defaultStoreId) {
        storeQuery = storeQuery.eq("id", defaultStoreId);
      }

      const [storeResult, itemResult] = await Promise.all([
        storeQuery,
        supabase
          .from("items")
          .select(`
            id,
            code,
            name,
            item_type,
            unit:units(code)
          `)
          .eq("is_active", true)
          .eq("item_type", "STOCK")
          .order("code"),
      ]);

      if (storeResult.error) throw storeResult.error;
      if (itemResult.error) throw itemResult.error;

      setStores((storeResult.data ?? []).map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
      })));

      setItems((itemResult.data ?? []).map((row) => {
        const unit = Array.isArray(row.unit) ? row.unit[0] : row.unit;
        return {
          id: row.id,
          code: row.code,
          name: row.name,
          unit_code: unit?.code ?? "-",
          item_type: row.item_type,
        };
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat master data.");
    } finally {
      setLoadingMaster(false);
    }
  }, [canAccessAllStores, defaultStoreId]);

  const loadStock = useCallback(async () => {
    if (!storeId) {
      setStocks([]);
      return;
    }

    setLoadingStock(true);
    setError(null);

    try {
      const { data, error: stockError } = await supabase
        .from("v_inventory_stock_summary")
        .select(`
          id,
          entity_id,
          item_id,
          store_id,
          item_code,
          item_name,
          unit_code,
          quantity_on_hand,
          average_cost,
          stock_value
        `)
        .eq("store_id", storeId)
        .order("item_code");

      if (stockError) throw stockError;

      setStocks((data ?? []).map((row) => ({
        id: row.item_id,
        stock_id: row.id,
        store_id: row.store_id,
        code: row.item_code,
        name: row.item_name,
        unit_code: row.unit_code ?? "-",
        item_type: "STOCK",
        quantity_on_hand: Number(row.quantity_on_hand ?? 0),
        average_cost: Number(row.average_cost ?? 0),
        stock_value: Number(row.stock_value ?? 0),
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat stok store.");
      setStocks([]);
    } finally {
      setLoadingStock(false);
    }
  }, [storeId]);

  useEffect(() => {
    void loadMaster();
  }, [loadMaster]);

  useEffect(() => {
    void loadStock();
  }, [loadStock]);

  const itemMap = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );

  const stockMap = useMemo(
    () => new Map(stocks.map((stock) => [stock.id, stock])),
    [stocks],
  );

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);

  const removeLine = (id: string) => {
    setLines((prev) => {
      const next = prev.filter((line) => line.id !== id);
      return next.length ? next : [emptyLine()];
    });
  };

  const updateLine = (
    id: string,
    field: keyof ConversionLine,
    value: string,
  ) => {
    setLines((prev) =>
      prev.map((line) =>
        line.id === id ? { ...line, [field]: value } : line,
      ),
    );
  };

  const resetForm = () => {
    setConversionDate(inputDate(new Date()));
    setOutputItemId("");
    setOutputQuantity("");
    setLines([emptyLine()]);
    setReference("");
    setDescription("");
    setError(null);
  };

  const postConversion = async () => {
    if (!entityId) throw new Error("Entity user tidak ditemukan.");
    if (!userId) throw new Error("User aplikasi tidak ditemukan.");
    if (!storeId) throw new Error("Pilih Store / Gudang terlebih dahulu.");
    if (!outputItemId) throw new Error("Pilih artikel hasil konversi.");

    const qtyOutput = Number(outputQuantity);
    if (!Number.isFinite(qtyOutput) || qtyOutput <= 0) {
      throw new Error("Qty hasil konversi harus lebih dari 0.");
    }

    const validLines = lines.filter((line) => line.item_id && line.quantity.trim() !== "");
    if (!validLines.length) throw new Error("Tambahkan minimal satu bahan baku.");

    const payload = validLines.map((line, index) => {
      const qty = Number(line.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new Error(`Qty bahan baku baris ${index + 1} harus lebih dari 0.`);
      }

      const stock = stockMap.get(line.item_id);
      if (!stock) {
        throw new Error(`Stok bahan baku baris ${index + 1} tidak tersedia pada store.`);
      }
      if (line.item_id === outputItemId) {
        throw new Error("Artikel hasil tidak boleh sama dengan bahan baku.");
      }
      if (qty > stock.quantity_on_hand) {
        throw new Error(
          `Stok ${stock.code} tidak mencukupi. Tersedia ${stock.quantity_on_hand} ${stock.unit_code}.`,
        );
      }

      return {
        item_id: line.item_id,
        quantity: qty,
      };
    });

    setPosting(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "post_inventory_conversion",
        {
          p_entity_id: entityId,
          p_conversion_date: conversionDate,
          p_store_id: storeId,
          p_output_item_id: outputItemId,
          p_output_quantity: qtyOutput,
          p_lines: payload,
          p_reference: reference.trim() || null,
          p_description: description.trim() || null,
          p_user_id: userId,
        },
      );

      console.log("CONVERSION PAYLOAD:", {
        p_entity_id: entityId,
        p_conversion_date: conversionDate,
        p_store_id: storeId,
        p_output_item_id: outputItemId,
        p_output_quantity: qtyOutput,
        p_lines: payload,
        p_reference: reference.trim() || null,
        p_description: description.trim() || null,
        p_user_id: userId,
      });

      console.log("CONVERSION DATA:", data);
      console.log("CONVERSION ERROR:", rpcError);

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal memposting konversi stok.";
      setError(message);
      throw new Error(message);
    } finally {
      setPosting(false);
    }
  };

  return {
    entityId,
    canAccessAllStores,
    defaultStoreId,
    stores,
    items,
    stocks,
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
    itemMap,
    stockMap,
    resetForm,
    postConversion,
    reload: async () => {
      await loadStock();
    },
  };
}
