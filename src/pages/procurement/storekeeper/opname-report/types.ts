export interface OpnameFilter {
  dateFrom: string;
  dateTo: string;
  storeId: string;
  keyword: string;
}

export interface OpnameItem {
  item_id: string;
  code: string;
  name: string;
  unit_code: string | null;
  qtySystem: number;
  qtyOpname: number;
  difference: number;
  averageCost: number;
  value: number;
  account_id: string | null;
  account_code: string | null;
  account_name: string | null;
}

export interface OpnameDocument {
  id: string;
  reference: string;
  movement_date: string;
  created_at: string;
  created_by: string | null;
  store: {
    id: string;
    code: string;
    name: string;
  } | null;
  items: OpnameItem[];
  totalDifference: number;
  totalValue: number;

  /**
   * Diisi hanya pada baris laporan hasil flatten per artikel.
   * `items` tetap berisi seluruh item dokumen agar modal Detail/Edit
   * tetap menerima dokumen lengkap.
   */
  reportItem?: OpnameItem;
}
