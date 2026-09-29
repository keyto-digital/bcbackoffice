import * as XLSX from "xlsx-js-style";
import type { MisBsDetailRow } from "../mis/types";
import type { MisBalanceSheetRow } from "../mis/useMisBalanceSheet";


export type MisWorkbookParams = {
  entityId: string;
  year: number;
  month: number;
  macroRows: MisMacroExportRow[];
  bsDetailRows: MisBsDetailRow[];
  coaRows?: MisCoaExportRow[];
  balanceSheetRows: MisBalanceSheetRow[];
};

export type MisMacroExportRow = {
  account_id: string;
  account_code: string;
  account_name: string;
  category_code: string;
  division_code: string;

  jan: number;
  feb: number;
  mar: number;
  apr: number;
  may: number;
  jun: number;
  jul: number;
  aug: number;
  sep: number;
  oct: number;
  nov: number;
  december: number;

  last_month: number;
  actual: number;
  budget: number;
  last_year: number;
  ytd: number;
  ytd_budget: number;
  last_year_ytd: number;
};

export type MisCoaExportRow = {
  code: string;
  name: string;
  category_code?: string | null;
  normal_balance?: string | null;
  is_active?: boolean;
  is_posting?: boolean;
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const CATEGORY_NAMES: Record<string, string> = {
  REVENUE: "Revenue",
  OTHER_INCOME: "Other Income",
  COGS: "Cost of Goods Sold",
  EXPENSE: "Expense",
  OTHER_EXPENSE: "Other Expense",
};

function buildBsDetailSheet(
  rows: MisBsDetailRow[],
  year: number,
  month: number,
): XLSX.WorkSheet {
  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  const monthName = monthNames[month - 1] ?? "";

  const headers = [
    "Account Code",
    "Account Name",
    "Category",
    "Normal Balance",
    "Last Month",
    "Actual",
    "Variance",
  ];

  const data: (string | number)[][] = [
    ["BS DETAIL"],
    [`Periode: ${monthName} ${year}`],
    [],
    headers,
  ];

  let currentCategory = "";

  for (const row of rows) {
    if (row.category_code !== currentCategory) {
      currentCategory = row.category_code;

      data.push([
        currentCategory === "ASSET"
          ? "ASSETS"
          : currentCategory === "LIABILITY"
            ? "LIABILITIES"
            : currentCategory === "EQUITY"
              ? "EQUITY"
              : currentCategory,
      ]);
    }

    data.push([
      row.account_code,
      row.account_name,
      row.category_code,
      row.normal_balance,
      row.last_month,
      row.actual,
      row.variance,
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);

  /*
   * Column width
   */
  ws["!cols"] = [
    { wch: 16 },
    { wch: 42 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
  ];

  /*
   * Title
   */
  ws["A1"] = {
    v: "BS DETAIL",
    t: "s",
    s: {
      font: {
        bold: true,
        sz: 16,
      },
    },
  };

  ws["A2"] = {
    v: `Periode: ${monthName} ${year}`,
    t: "s",
    s: {
      font: {
        bold: true,
        sz: 11,
      },
    },
  };

  /*
   * Header berada di row 4
   */
  for (let col = 0; col < headers.length; col++) {
    const cellAddress = XLSX.utils.encode_cell({
      r: 3,
      c: col,
    });

    const cell = ws[cellAddress];

    if (!cell) continue;

    cell.s = {
      font: {
        name: "Calibri",
        sz: 11,
        bold: true,
        color: "000000",
      },
      fill: {
        fgColor: {
          rgb: "ABF59F",
        },
      },
      border: {
        bottom: {
          style: "thin",
          color: { rgb: "000000" },
        },
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: true,
      },
    };
  }

  /*
   * Format angka
   *
   * Row:
   * 0 title
   * 1 period
   * 2 blank
   * 3 header
   * 4+ data
   */
  for (let rowIndex = 4; rowIndex < data.length; rowIndex++) {
    for (const colIndex of [4, 5, 6]) {
      const cellAddress = XLSX.utils.encode_cell({
        r: rowIndex,
        c: colIndex,
      });

      const cell = ws[cellAddress];

      if (!cell) continue;

      cell.z = '#,##0.00;[Red](#,##0.00)';
      cell.s = {
        alignment: {
          horizontal: "right",
        },
      };
    }
  }

  /*
   * Category separator
   */
  for (let rowIndex = 4; rowIndex < data.length; rowIndex++) {
    const firstCell = ws[
      XLSX.utils.encode_cell({
        r: rowIndex,
        c: 0,
      })
    ];

    if (
      firstCell &&
      typeof firstCell.v === "string" &&
      [
        "ASSETS",
        "LIABILITIES",
        "EQUITY",
      ].includes(firstCell.v)
    ) {
      firstCell.s = {
        font: {
          bold: true,
          sz: 11,
        },
      };
    }
  }

  applyFullGrid(
    ws,
    4,
    data.length,
    1,
    7,
  );

  /*
   * Freeze header
   */
  ws["!freeze"] = {
    xSplit: 0,
    ySplit: 4,
  };

  return ws;
}

function numberValue(value: unknown): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function createSheet(
  rows: unknown[][],
  widths: number[],
): XLSX.WorkSheet {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  worksheet["!cols"] = widths.map((width) => ({
    wch: width,
  }));

  return worksheet;
}

function styleHeader(
  worksheet: XLSX.WorkSheet,
  rowNumber: number,
  columnCount: number,
): void {
  for (let column = 0; column < columnCount; column += 1) {
    const address = XLSX.utils.encode_cell({
      r: rowNumber,
      c: column,
    });

    /*
     * Header pada workbook MIS banyak menggunakan merged cells.
     * Sel yang kosong tetap harus dibuat dan diberi style agar
     * fill + border terlihat utuh setelah diexport oleh xlsx-js-style.
     */
    const cell =
      worksheet[address] ??
      ({
        v: "",
        t: "s",
      } as XLSX.CellObject);

    worksheet[address] = cell;

    cell.s = {
      font: {
        name: "Calibri",
        sz: 11,
        bold: true,
        color: "000000",
      },
      fill: {
        fgColor: {
          rgb: "ABF59F",
        },
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: true,
      },
      border: {
        top: {
          style: "thin",
          color: "000000",
        },
        bottom: {
          style: "thin",
          color: "000000",
        },
        left: {
          style: "thin",
          color: "000000",
        },
        right: {
          style: "thin",
          color: "000000",
        },
      },
    };
  }
}

function styleTitle(
  worksheet: XLSX.WorkSheet,
  rowNumber: number,
  columnCount: number,
): void {
  for (let column = 0; column < columnCount; column += 1) {
    const address = XLSX.utils.encode_cell({
      r: rowNumber,
      c: column,
    });

    const cell = worksheet[address];

    if (!cell) {
      continue;
    }

    cell.s = {
      font: {
        name: "Calibri",
        bold: true,
        size: 11,
        color: "000000",
      },
      fill: {
        fgColor: {
          rgb: "ABF59F",
        },
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: true,
      },
      border: {
        bottom: {
          style: "thin",
          color: { rgb: "000000" },
        },
      },
    };
  }
}

function styleNumberColumns(
  worksheet: XLSX.WorkSheet,
  startRow: number,
  endRow: number,
  columns: number[],
): void {
  for (let row = startRow; row <= endRow; row += 1) {
    for (const column of columns) {
      const address = XLSX.utils.encode_cell({
        r: row,
        c: column,
      });

      const cell = worksheet[address];

      if (!cell) {
        continue;
      }

      cell.z = '#,##0.00;[Red]\\-#,##0.00;\\-';
    }
  }
}

function applyFullGrid(
  worksheet: XLSX.WorkSheet,
  startRow: number,
  endRow: number,
  startColumn: number,
  endColumn: number,
): void {
  const thin = { style: "thin" as const, color: "000000" };

  for (let row = startRow; row <= endRow; row += 1) {
    for (let column = startColumn; column <= endColumn; column += 1) {
      const address = XLSX.utils.encode_cell({
        r: row - 1,
        c: column - 1,
      });
      const cell =
        worksheet[address] ?? ({ v: "", t: "s" } as XLSX.CellObject);

      worksheet[address] = cell;
      cell.s = {
        ...(cell.s ?? {}),
        border: {
          ...(cell.s?.border ?? {}),
          top: thin,
          bottom: thin,
          left: thin,
          right: thin,
        },
      };
    }
  }
}

function addAutoFilter(
  worksheet: XLSX.WorkSheet,
  headerRow: number,
  lastRow: number,
  lastColumn: number,
): void {
  worksheet["!autofilter"] = {
    ref: `A${headerRow + 1}:${XLSX.utils.encode_col(lastColumn)}${
      lastRow + 1
    }`,
  };
}

function addFreezePane(
  worksheet: XLSX.WorkSheet,
  row: number,
  column: number,
): void {
  worksheet["!freeze"] = {
    xSplit: column,
    ySplit: row,
    topLeftCell: XLSX.utils.encode_cell({
      r: row,
      c: column,
    }),
    activePane: "bottomRight",
    state: "frozen",
  };
}

/**
 * Membuat sheet MACRO berdasarkan hasil MIS Engine.
 *
 * Struktur:
 * Account Code
 * Account Name
 * Division
 * Jan-Dec
 * Last Month
 * Actual
 * Budget
 * Last Year
 * YTD
 * YTD Budget
 * Last Year YTD
 */
function buildMacroSheet(
  macroRows: MisMacroExportRow[],
  year: number,
  month: number,
): XLSX.WorkSheet {
  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  const rows: unknown[][] = [];

  /*
   * ============================================================
   * ROW 1
   * ============================================================
   */

  rows.push([
    `Period of ${monthNames[month - 1] ?? ""} ${year}`,
  ]);

  /*
   * ============================================================
   * ROW 2
   * ============================================================
   */

  rows.push([
    "BUTTER CLUB BAKERY",
  ]);

  /*
   * ============================================================
   * ROW 3
   * ============================================================
   */

  rows.push([]);

  /*
   * ============================================================
   * ROW 4
   *
   * A : Chart Of Account
   * B : Description
   * C : merged with B
   * D : Last Month
   * E : Actual
   * F : Budget
   * G : Last Year
   * H : Year to Date
   * I : YTD Budget
   * J : Last Year YTD
   * K : spacer
   *
   * L:AU = 12 bulan x 3 kolom
   * AV:AX = TOTAL x 3 kolom
   * ============================================================
   */

  const headerRow4: unknown[] = [
    "Chart Of Account",
    "Description",
    null,

    "Last Month",
    "Actual",
    `Budget ${monthNames[month - 1] ?? ""} ${year}`,
    "Last Year",
    "Year to Date",
    "YTD Budget ",
    "Last Year YTD",

    null,
  ];

  for (const monthName of monthNames) {
    headerRow4.push(`${monthName} ${year}`);
    headerRow4.push(null);
    headerRow4.push(null);
  }

  headerRow4.push(
    "TOTAL",
    null,
    null,
  );

  rows.push(headerRow4);

  /*
   * ============================================================
   * ROW 5
   * ============================================================
   */

  const headerRow5: unknown[] = [
    null,
    null,
    null,

    null,
    null,
    null,
    null,
    null,
    null,
    null,

    null,
  ];

  for (let i = 0; i < 12; i += 1) {
    headerRow5.push(
      "Actual",
      "Budget",
      "Last Year",
    );
  }

  headerRow5.push(
    "Actual",
    "Budget",
    "Last Year",
  );

  rows.push(headerRow5);

  /*
   * ============================================================
   * DATA
   * ============================================================
   *
   * Untuk tahap ini kita mempertahankan seluruh data dari
   * get_mis_macro().
   *
   * Kolom:
   *
   * A = account code
   * B = account name
   * C = account code
   * D = last month
   * E = actual
   * F = budget
   * G = last year
   * H = YTD
   * I = YTD Budget
   * J = Last Year YTD
   * K = spacer
   *
   * L:AU = monthly actual/budget/last year
   * AV:AX = total actual/budget/last year
   * ============================================================
   */

  for (const item of macroRows) {
    const row: unknown[] = [
      item.account_code,
      item.account_name,
      item.account_code,

      formatNumber(item.last_month),
      formatNumber(item.actual),
      formatNumber(item.budget),
      formatNumber(item.last_year),
      formatNumber(item.ytd),
      formatNumber(item.ytd_budget),
      formatNumber(item.last_year_ytd),

      null,
    ];

    /*
     * Jan - Dec
     *
     * Template memakai:
     *
     * Actual
     * Budget
     * Last Year
     *
     * per bulan.
     *
     * Data dari RPC sekarang memiliki:
     *
     * jan ... december = actual bulan berjalan
     *
     * sedangkan budget/last year bulanan belum tersedia
     * sebagai field terpisah.
     *
     * Jadi actual bulanan ditempatkan pada kolom Actual.
     */

    const monthlyActuals = [
      item.jan,
      item.feb,
      item.mar,
      item.apr,
      item.may,
      item.jun,
      item.jul,
      item.aug,
      item.sep,
      item.oct,
      item.nov,
      item.december,
    ];

    for (const value of monthlyActuals) {
      row.push(
        formatNumber(value),
        0,
        0,
      );
    }

    /*
     * TOTAL
     */

    row.push(
      formatNumber(item.actual),
      formatNumber(item.budget),
      formatNumber(item.last_year),
    );

    rows.push(row);
  }

  /*
   * ============================================================
   * STATISTIC ROWS
   *
   * Template asli memiliki row 601-607.
   *
   * Kita tambahkan setelah data sehingga struktur MACRO
   * tetap memiliki area statistik.
   * ============================================================
   */

  rows.push([]);

  const statisticStartRow = rows.length + 1;

  rows.push([
    null,
    "No. of Avaliable Turn Over/hours",
    null,
    null,
  ]);

  rows.push([
    null,
    "No. of Seat per Table",
    null,
    null,
  ]);

  rows.push([
    null,
    "No. of Parties",
    null,
    null,
  ]);

  rows.push([
    null,
    "Table Turnover Rate",
    null,
    null,
  ]);

  rows.push([
    null,
    "Table Occupancy %",
    null,
    null,
  ]);

  rows.push([
    null,
    "Average Check per Guest",
    null,
    null,
  ]);

  rows.push([
    null,
    "Rev per Available Table",
    null,
    null,
  ]);

  /*
   * ============================================================
   * WORKSHEET
   * ============================================================
   */

  const worksheet = createSheet(
    rows,
    [
      13.5546875,
      36.77734375,
      14.77734375,
      16.77734375,
      13,
      18.77734375,
      16.77734375,
      18.77734375,
      13,
      13,
      3.77734375,
      16.77734375,
      13,
      13,
      13,
      13,
      13,
      13,
      13,
      13,
      13,
      13,
      13,
      13,
      13,
      13,
      13,
      13,
      13,
      13,
      13,
      13,
      13,
      13,
      13,
      13,
      13,
      13,
      13,
      13,
      13,
      13,
      13,
      13,
      13,
      13,
      13,
      13,
      13,
      13,
    ],
  );

  /*
   * ============================================================
   * MERGED CELLS
   * ============================================================
   */

  worksheet["!merges"] = [
    { s: { r: 3, c: 0 }, e: { r: 4, c: 0 } }, // A4:A5
    { s: { r: 3, c: 1 }, e: { r: 4, c: 2 } }, // B4:C5

    { s: { r: 3, c: 3 }, e: { r: 4, c: 3 } }, // D4:D5
    { s: { r: 3, c: 4 }, e: { r: 4, c: 4 } }, // E4:E5
    { s: { r: 3, c: 5 }, e: { r: 4, c: 5 } }, // F4:F5
    { s: { r: 3, c: 6 }, e: { r: 4, c: 6 } }, // G4:G5
    { s: { r: 3, c: 7 }, e: { r: 4, c: 7 } }, // H4:H5
    { s: { r: 3, c: 8 }, e: { r: 4, c: 8 } }, // I4:I5
    { s: { r: 3, c: 9 }, e: { r: 4, c: 9 } }, // J4:J5

    // Jan - Dec
    ...Array.from(
      { length: 12 },
      (_, index) => {
        const startCol = 11 + index * 3;

        return {
          s: {
            r: 3,
            c: startCol,
          },
          e: {
            r: 3,
            c: startCol + 2,
          },
        };
      },
    ),

    // TOTAL
    {
      s: { r: 3, c: 47 },
      e: { r: 3, c: 49 },
    },
  ];

  /*
   * ============================================================
   * TITLE STYLE
   * ============================================================
   */

  styleTitle(
    worksheet,
    0,
    49,
  );

  styleTitle(
    worksheet,
    1,
    49,
  );

  // Title area mengikuti master: hanya A:B yang hijau dan tanpa border.
  for (const rowNumber of [1, 2]) {
    for (let col = 1; col <= 50; col += 1) {
      const address = XLSX.utils.encode_cell({
        r: rowNumber - 1,
        c: col - 1,
      });
      const cell = worksheet[address];
      if (!cell) continue;

      cell.s = {
        ...(cell.s ?? {}),
        fill: col <= 2 ? { fgColor: { rgb: "ABF59F" } } : undefined,
        border: undefined,
      };
    }
  }

  /*
   * ============================================================
   * HEADER STYLE
   * ============================================================
   */

  styleHeader(
    worksheet,
    3,
    49,
  );

  styleHeader(
    worksheet,
    4,
    49,
  );

  // K adalah separator: kosong dan tanpa fill pada header.
  for (const address of ["K4", "K5"]) {
    const cell = worksheet[address];
    if (!cell) continue;
    cell.s = {
      ...(cell.s ?? {}),
      fill: undefined,
      border: {
        ...(cell.s?.border ?? {}),
        left: { style: "thin", color: "000000" },
        right: { style: "thin", color: "000000" },
      },
    };
  }

  /*
   * ============================================================
   * NUMBER FORMAT
   * ============================================================
   */

  const dataStartRow = 5;
  const dataEndRow = 4 + macroRows.length;

  /*
   * D:J
   */

  styleNumberColumns(
    worksheet,
    dataStartRow,
    dataEndRow,
    [
      3,
      4,
      5,
      6,
      7,
      8,
      9,
    ],
  );

  /*
   * L:AX
   */

  styleNumberColumns(
    worksheet,
    dataStartRow,
    dataEndRow,
    Array.from(
      { length: 39 },
      (_, index) => index + 11,
    ),
  );

  applyFullGrid(
    worksheet,
    6,
    rows.length,
    1,
    50,
  );

  /*
  * Border statistik MACRO:
  * D93:J99 dan L93:AX99 harus full border.
  * Kolom K4:K99 adalah separator:
  * hanya border kiri/kanan, tanpa border atas/bawah.
  */
  applyFullGrid(
    worksheet,
    statisticStartRow,
    rows.length,
    4,
    10,
  );

  applyFullGrid(
    worksheet,
    statisticStartRow,
    rows.length,
    12,
    50,
  );

  // K4:K99 = separator
  for (let row = 4; row <= rows.length; row += 1) {
    const address = XLSX.utils.encode_cell({
      r: row - 1,
      c: 10,
    });

    const cell =
      worksheet[address] ?? ({ v: "", t: "s" } as XLSX.CellObject);

    worksheet[address] = cell;

    cell.s = {
      ...(cell.s ?? {}),
      border: {
        top: undefined,
        bottom: undefined,
        left: { style: "thin", color: "000000" },
        right: { style: "thin", color: "000000" },
      },
    };
  }

  /*
   * ============================================================
   * STATISTIC FORMULAS
   * ============================================================
   *
   * Untuk setiap kolom numeric:
   *
   * row + 0 = turnover/hour
   * row + 1 = seat/table
   * row + 2 = parties
   * row + 3 = turnover rate
   * row + 4 = occupancy %
   * row + 5 = average check
   * row + 6 = revenue/table
   *
   * Statistik mengikuti formula workbook referensi.
   * ============================================================
   */

  const statisticRows = [
    statisticStartRow,
    statisticStartRow + 1,
    statisticStartRow + 2,
    statisticStartRow + 3,
    statisticStartRow + 4,
    statisticStartRow + 5,
    statisticStartRow + 6,
  ];

  /*
   * Statistik akan diformulasikan pada kolom D:AX.
   *
   * Referensi akun statistik dari template:
   *
   * 589 = No. of Table Available
   * 590 = No. of Available Hours
   * 591 = No. of Seat Available
   * 594 = No. of Guest
   *
   * Pada data baru, akun tersebut mungkin belum tersedia.
   * Karena itu formula hanya dibuat untuk kolom yang memang
   * memiliki sumber statistik.
   */

  // Statistik MACRO mengikuti posisi akun aktual.
  // Tidak ada lagi referensi row template seperti 589/590/591/594
  // atau 186/426/427/432.
  const normalizeMacroName = (value: unknown): string =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/\\s+/g, " ");

  const macroRowByName = new Map<string, number>();
  macroRows.forEach((item, index) => {
    const name = normalizeMacroName(item.account_name);
    if (name && !macroRowByName.has(name)) {
      macroRowByName.set(name, index + 6);
    }
  });

  const sourceRow = (name: string): number | null =>
    macroRowByName.get(normalizeMacroName(name)) ?? null;

  const tableAvailableRow = sourceRow("No. of Table Available");
  const availableHoursRow = sourceRow("No. of Available Hours");
  const seatAvailableRow = sourceRow("No. of Seat Available");
  const guestRow = sourceRow("No. of Guest");

  const revenueSourceRows = macroRows
    .map((item, index) => ({ item, row: index + 6 }))
    .filter(
      ({ item }) =>
        item.category_code === "REVENUE" &&
        item.account_name?.trim(),
    )
    .map(({ row }) => row);

  // Statistik tambahan berada setelah seluruh data MACRO.
  // Row ini dihitung dari panjang macroRows, bukan dari template lama.
  const dynamicStatisticRows = {
    turnoverPerHour: 7 + macroRows.length,
    seatPerTable: 8 + macroRows.length,
    parties: 9 + macroRows.length,
    turnoverRate: 10 + macroRows.length,
    occupancy: 11 + macroRows.length,
    averageCheck: 12 + macroRows.length,
    revenuePerTable: 13 + macroRows.length,
  };

  const ref = (colLetter: string, row: number | null): string =>
    row === null ? "0" : `${colLetter}${row}`;

  const revenueFormula = (colLetter: string): string =>
    revenueSourceRows.length > 0
      ? revenueSourceRows
          .map((row) => `${colLetter}${row}`)
          .join("+")
      : "0";

  for (let col = 3; col <= 49; col += 1) {
    // K adalah separator dan harus tetap kosong, termasuk pada row 93:99.
    if (col === 10) continue;

    const colLetter = XLSX.utils.encode_col(col);

    worksheet[`${colLetter}${dynamicStatisticRows.turnoverPerHour}`] =
      formulaCell(
        `IF(${ref(colLetter, availableHoursRow)}=0,0,${ref(colLetter, tableAvailableRow)}/${ref(colLetter, availableHoursRow)})`,
      );

    worksheet[`${colLetter}${dynamicStatisticRows.seatPerTable}`] =
      formulaCell(
        `IF(${ref(colLetter, tableAvailableRow)}=0,0,${ref(colLetter, seatAvailableRow)}/${ref(colLetter, tableAvailableRow)})`,
      );

    worksheet[`${colLetter}${dynamicStatisticRows.parties}`] = formulaCell(
      `IF(${colLetter}${dynamicStatisticRows.seatPerTable}=0,0,${ref(colLetter, guestRow)}/${colLetter}${dynamicStatisticRows.seatPerTable})`,
    );

    worksheet[`${colLetter}${dynamicStatisticRows.turnoverRate}`] =
      formulaCell(
        `IF(${ref(colLetter, tableAvailableRow)}=0,0,${colLetter}${dynamicStatisticRows.parties}/${ref(colLetter, tableAvailableRow)})`,
      );

    worksheet[`${colLetter}${dynamicStatisticRows.occupancy}`] =
      formulaCell(
        `IF(${ref(colLetter, tableAvailableRow)}*${colLetter}${dynamicStatisticRows.turnoverPerHour}=0,0,${colLetter}${dynamicStatisticRows.parties}/(${ref(colLetter, tableAvailableRow)}*${colLetter}${dynamicStatisticRows.turnoverPerHour}))`,
      );

    worksheet[`${colLetter}${dynamicStatisticRows.averageCheck}`] =
      formulaCell(
        `IF(${ref(colLetter, guestRow)}=0,0,(${revenueFormula(colLetter)})/${ref(colLetter, guestRow)})`,
      );

    worksheet[`${colLetter}${dynamicStatisticRows.revenuePerTable}`] =
      formulaCell(
        `IF(${ref(colLetter, tableAvailableRow)}*${colLetter}${dynamicStatisticRows.turnoverPerHour}=0,0,(${revenueFormula(colLetter)})/(${ref(colLetter, tableAvailableRow)}*${colLetter}${dynamicStatisticRows.turnoverPerHour}))`,
      );
  }

  /*
   * ============================================================
   * STATISTIC STYLE
   * ============================================================
   */

  for (const rowNumber of statisticRows) {
    for (let col = 1; col <= 49; col += 1) {
      const cell =
        worksheet[
          XLSX.utils.encode_cell({
            r: rowNumber - 1,
            c: col,
          })
        ];

      if (cell) {
        cell.s = {
          ...(cell.s ?? {}),
          font: {
            ...(cell.s?.font ?? {}),
            bold: true,
          },
        };
      }
    }
  }

  /*
  * ============================================================
  * STATISTIC BORDER
  * ============================================================
  *
  * D93:J99  = full border
  * L93:AX99 = full border
  * K4:K99   = separator kiri/kanan saja
  *
  * Border sengaja diterapkan DI SINI, setelah formulaCell(),
  * karena formulaCell() dapat mengganti object cell beserta style.
  * ============================================================
  */

  const statisticBorder = {
    top: {
      style: "thin" as const,
      color: "000000",
    },
    bottom: {
      style: "thin" as const,
      color: "000000",
    },
    left: {
      style: "thin" as const,
      color: "000000",
    },
    right: {
      style: "thin" as const,
      color: "000000",
    },
  };

  // D:J = kolom 4:10
  for (
    let row = statisticStartRow;
    row <= statisticStartRow + 6;
    row += 1
  ) {
    for (let col = 4; col <= 10; col += 1) {
      const address = XLSX.utils.encode_cell({
        r: row - 1,
        c: col - 1,
      });

      const cell =
        worksheet[address] ??
        ({
          v: "",
          t: "s",
        } as XLSX.CellObject);

      worksheet[address] = cell;

      cell.s = {
        ...(cell.s ?? {}),
        border: {
          ...(cell.s?.border ?? {}),
          ...statisticBorder,
        },
      };
    }
  }

  // L:AX = kolom 12:50
  for (
    let row = statisticStartRow;
    row <= statisticStartRow + 6;
    row += 1
  ) {
    for (let col = 12; col <= 50; col += 1) {
      const address = XLSX.utils.encode_cell({
        r: row - 1,
        c: col - 1,
      });

      const cell =
        worksheet[address] ??
        ({
          v: "",
          t: "s",
        } as XLSX.CellObject);

      worksheet[address] = cell;

      cell.s = {
        ...(cell.s ?? {}),
        border: {
          ...(cell.s?.border ?? {}),
          ...statisticBorder,
        },
      };
    }
  }

  // K4:K99 = separator.
  // Hanya kiri + kanan.
  // Tidak ada border atas/bawah.
  for (let row = 4; row <= rows.length; row += 1) {
    const address = XLSX.utils.encode_cell({
      r: row - 1,
      c: 10, // K
    });

    const cell =
      worksheet[address] ??
      ({
        v: "",
        t: "s",
      } as XLSX.CellObject);

    worksheet[address] = cell;

    cell.s = {
      ...(cell.s ?? {}),
      border: {
        ...(cell.s?.border ?? {}),
        top: undefined,
        bottom: undefined,
        left: {
          style: "thin",
          color: "000000",
        },
        right: {
          style: "thin",
          color: "000000",
        },
      },
    };
  }

  /*
   * ============================================================
   * FREEZE
   * ============================================================
   */

  addFreezePane(
    worksheet,
    5,
    11,
  );

  /*
   * ============================================================
   * AUTOFILTER
   * ============================================================
   *
   * Template asli tidak menggunakan format tabel sederhana,
   * jadi jangan memasang autofilter ke seluruh 50 kolom.
   * ============================================================
   */

  return worksheet;
}

/**
 * Sheet COA.
 */
function buildCoaSheet(
  coaRows: MisCoaExportRow[],
  year: number,
): XLSX.WorkSheet {
  const rows: unknown[][] = [];

  rows.push([
    `CHART OF ACCOUNTS - ${year}`,
  ]);

  rows.push([]);

  rows.push([
    "Account Code",
    "Account Name",
    "Category",
    "Normal Balance",
    "Active",
    "Posting",
  ]);

  for (const item of coaRows) {
    rows.push([
      item.code,
      item.name,
      CATEGORY_NAMES[item.category_code ?? ""] ??
        item.category_code ??
        "",
      item.normal_balance ?? "",
      item.is_active ? "Yes" : "No",
      item.is_posting ? "Yes" : "No",
    ]);
  }

  const worksheet = createSheet(rows, [
    18.77734375,
    42.77734375,
    24.77734375,
    18.77734375,
    12.77734375,
    13,
  ]);

  styleTitle(
    worksheet,
    0,
    6,
  );

  // Pada master, judul COA hanya berada di B1.
  for (const col of [1, 3, 4, 5, 6]) {
    const cell = worksheet[
      XLSX.utils.encode_cell({ r: 0, c: col - 1 })
    ];
    if (!cell) continue;
    cell.s = {
      ...(cell.s ?? {}),
      fill: undefined,
      border: undefined,
    };
  }

  styleHeader(
    worksheet,
    2,
    6,
  );

  applyFullGrid(
    worksheet,
    3,
    rows.length,
    1,
    6,
  );

  addFreezePane(
    worksheet,
    3,
    2,
  );

  addAutoFilter(
    worksheet,
    2,
    rows.length - 1,
    5,
  );

  return worksheet;
}

/**
 * Sheet Period.
 */
function buildPeriodSheet(
  year: number,
  month: number,
): XLSX.WorkSheet {
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Agst",
    "Sept",
    "Okt",
    "Nov",
    "Des",
  ];


  const current = monthNames[month - 1] ?? "";
  const previousMonth = month === 1 ? 12 : month - 1;
  const previousYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const rows: unknown[][] = [
    ["MIS REPORT PERIOD"],
    [],
    [],
    [null, "Bussines Name", ":", "BUTTER CLUB BAKERY", null],
    [null, "Year", ":", year, null],
    [null, "Month", ":", current, null],
    [null, "Currency", ":", "Rupiah (IDR)", null],
    [null, "Period", ":", `${current} ${year}`, null],
    [
      null,
      "Last Month",
      ":",
      `${monthNames[previousMonth - 1] ?? ""} ${previousYear}`,
      null,
    ],
    [
      null,
      "Next Month",
      ":",
      `${monthNames[nextMonth - 1] ?? ""} ${nextYear}`,
      null,
    ],
    [
      null,
      "Last Year",
      ":",
      `${current} ${year - 1}`,
      null,
    ],
    [
      null,
      "Last Closing Period",
      ":",
      new Date(year, month, 0),
      null,
    ],
    ["", "", "", "", ""],
  ];

  const worksheet = createSheet(rows, [
    2.21875,
    24.77734375,
    1.5546875,
    19.44140625,
    2.21875,
  ]);

  const thin = { style: "thick" as const, color: "000000" };

  // Master workbook memakai kotak tebal hanya pada area A3:E13.
  for (let r = 3; r <= 13; r += 1) {
    for (let c = 1; c <= 5; c += 1) {
      const address = XLSX.utils.encode_cell({
        r: r - 1,
        c: c - 1,
      });
      const cell =
        worksheet[address] ?? ({ v: "", t: "s" } as XLSX.CellObject);

      worksheet[address] = cell;

      cell.s = {
        ...(cell.s ?? {}),
        font: {
          name: "Calibri",
          sz: 11,
          bold: c === 2 && r >= 4 && r <= 12,
          color: "000000",
        },
        border: {
          ...(cell.s?.border ?? {}),
          ...(c === 1 ? { left: thin } : {}),
          ...(c === 5 ? { right: thin } : {}),
          ...(r === 3 ? { top: thin } : {}),
          ...(r === 13 ? { bottom: thin } : {}),
        },
      };
    }
  }

  worksheet["D5"]!.s = {
    ...(worksheet["D5"]!.s ?? {}),
    alignment: { horizontal: "left" },
  };

  worksheet["D12"]!.z = "dd mmm yy";
  worksheet["D12"]!.s = {
    ...(worksheet["D12"]!.s ?? {}),
    alignment: { horizontal: "left" },
  };

  return worksheet;
}

/**
 * Sheet Year Summary.
 *
 * Menggunakan data MACRO yang sudah dikonsolidasikan
 * oleh MIS Engine.
 */
function buildYearSummarySheet(
  macroRows: MisMacroExportRow[],
  year: number,
): XLSX.WorkSheet {
  /*
   * YEAR SUMMARY mengikuti persis struktur workbook referensi:
   *
   * A       = Period / Description
   * B:C     = YEAR YTD (Actual / %)
   * D:E     = Januari
   * F:G     = Februari
   * ...
   * T:U     = September
   * V:W     = Oktober
   * X:Y     = November
   * Z:AA    = Desember
   * AB      = spacer
   *
   * Sumber angka:
   * - YTD      : field ytd dari MACRO
   * - Bulanan  : jan ... december dari MACRO
   * - %        : nilai / total revenue pada periode yang sama
   *
   * Hanya sheet Year Summary yang memakai layout ini.
   * Sheet lain tidak diubah.
   */

  type MetricItem = {
    label: string;
    items: MisMacroExportRow[];
  };


  const byCode = (code: string): MisMacroExportRow | undefined =>
    macroRows.find((item) => item.account_code === code);

  const byPrefix = (prefix: string): MisMacroExportRow[] =>
    macroRows.filter((item) => item.account_code.startsWith(prefix));

  const revenueItems: MisMacroExportRow[] = [
    byCode("411101"),
    byCode("411102"),
    byCode("411103"),
    byCode("411201"),
    byCode("411202"),
  ].filter((item): item is MisMacroExportRow => Boolean(item));

  /*
   * Template memakai total YTD NET REVENUE dari Food + Beverage.
   * Other Revenue tetap ditampilkan dan persentasenya dihitung
   * terhadap total tersebut, sama seperti workbook referensi.
   */
  const ytdRevenueItems = revenueItems;

  const costItems: MisMacroExportRow[] = [
    byCode("511101"),
    byCode("511102"),
    byCode("511103"),
    byCode("511104"),
  ].filter((item): item is MisMacroExportRow => Boolean(item));

  const expenseGroups: MetricItem[] = [
    { label: "F&B", items: byPrefix("611") },
    { label: "BAR", items: byPrefix("621") },
    {
      label: "PAYROLL RELATED EXPENSES",
      items: byPrefix("631"),
    },
    { label: "A&G EXPENSES", items: byPrefix("641") },
    {
      label: "SALES DESIGN EXPENSES",
      items: byPrefix("651"),
    },
    { label: "SERVICE EXPENSES", items: byPrefix("661") },
    { label: "HRD EXPENSES", items: byPrefix("671") },
    { label: "POMEC EXPENSES", items: byPrefix("681") },
    { label: "ENERGY", items: byPrefix("691") },
  ];

  const nonOperatingItems = [
    byCode("711101"),
    byCode("711107"),
  ].filter((item): item is MisMacroExportRow => Boolean(item));

  const getMonthValue = (
    item: MisMacroExportRow,
    monthIndex: number,
  ): number => {
    const values = [
      item.jan,
      item.feb,
      item.mar,
      item.apr,
      item.may,
      item.jun,
      item.jul,
      item.aug,
      item.sep,
      item.oct,
      item.nov,
      item.december,
    ];

    return numberValue(values[monthIndex]);
  };

  const sumYtd = (items: MisMacroExportRow[]): number =>
    items.reduce(
      (sum, item) => sum + numberValue(item.ytd),
      0,
    );

  const sumMonth = (
    items: MisMacroExportRow[],
    monthIndex: number,
  ): number =>
    items.reduce(
      (sum, item) => sum + getMonthValue(item, monthIndex),
      0,
    );

  const rows: unknown[][] = [];

  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  /*
   * Header row.
   */
  rows.push([
    "Period / Description",
    `${year} YTD`,
    null,
    ...monthNames.flatMap((month) => [month, null]),
  ]);

  /*
   * Helper menambahkan satu baris detail.
   */
  const pushDetailRow = (
    label: string,
    item: MisMacroExportRow,
    ytdDenominator: number,
    monthlyRevenueDenominators: number[],
  ) => {
    const ytdValue = numberValue(item.ytd);

    const row: unknown[] = [
      label,
      ytdValue,
      ytdDenominator === 0
        ? 0
        : ytdValue / ytdDenominator,
    ];

    for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
      const value = getMonthValue(item, monthIndex);
      const denominator = monthlyRevenueDenominators[monthIndex];

      row.push(
        value,
        denominator === 0 ? 0 : value / denominator,
      );
    }

    rows.push(row);
  };

  /*
   * Section: NET REVENUE
   */
  rows.push(["NET REVENUE"]);

  const ytdRevenueDenominator = sumYtd(ytdRevenueItems);
  const monthlyRevenueDenominators = Array.from(
    { length: 12 },
    (_, monthIndex) => sumMonth(revenueItems, monthIndex),
  );

  for (const item of revenueItems) {
    pushDetailRow(
      item.account_name,
      item,
      ytdRevenueDenominator,
      monthlyRevenueDenominators,
    );
  }

  rows.push([]);

  /*
   * TOTAL NET REVENUE.
   *
   * YTD mengikuti template: Food + Beverage.
   * Monthly mengikuti seluruh revenue item.
   */
  rows.push([
    "TOTAL NET REVENUE",
    ytdRevenueDenominator,
    ytdRevenueDenominator === 0 ? 0 : 1,
    ...monthlyRevenueDenominators.flatMap((value) => [
      value,
      value === 0 ? null : 1,
    ]),
  ]);

  /*
   * COST OF SALES
   */
  rows.push(["COST OF SALES"]);

  const ytdCostTotal = sumYtd(costItems);

  for (const item of costItems) {
    pushDetailRow(
      item.account_name,
      item,
      ytdRevenueDenominator,
      monthlyRevenueDenominators,
    );
  }

  rows.push([]);

  rows.push([
    "TOTAL COST OF SALES",
    ytdCostTotal,
    ytdRevenueDenominator === 0
      ? 0
      : ytdCostTotal / ytdRevenueDenominator,
    ...Array.from({ length: 12 }, (_, monthIndex) => {
      const value = sumMonth(costItems, monthIndex);
      const revenue = monthlyRevenueDenominators[monthIndex];

      return [
        value,
        revenue === 0 ? 0 : value / revenue,
      ];
    }).flat(),
  ]);

  /*
   * EXPENSES
   */
  rows.push(["EXPENSES"]);

  const allExpenseItems = expenseGroups.flatMap(
    (group) => group.items,
  );

  const ytdExpenseTotal = sumYtd(allExpenseItems);

  for (const group of expenseGroups) {
    if (group.items.length === 0) {
      rows.push([
        group.label,
        0,
        ytdRevenueDenominator === 0
          ? 0
          : 0 / ytdRevenueDenominator,
        ...Array.from({ length: 12 }, () => [0, 0]).flat(),
      ]);
      continue;
    }

    const ytdGroupTotal = sumYtd(group.items);

    rows.push([
      group.label,
      ytdGroupTotal,
      ytdRevenueDenominator === 0
        ? 0
        : ytdGroupTotal / ytdRevenueDenominator,
      ...Array.from({ length: 12 }, (_, monthIndex) => {
        const value = sumMonth(group.items, monthIndex);
        const revenue = monthlyRevenueDenominators[monthIndex];

        return [
          value,
          revenue === 0 ? 0 : value / revenue,
        ];
      }).flat(),
    ]);
  }

  rows.push([]);

  rows.push([
    "TOTAL EXPENSES",
    ytdExpenseTotal,
    ytdRevenueDenominator === 0
      ? 0
      : ytdExpenseTotal / ytdRevenueDenominator,
    ...Array.from({ length: 12 }, (_, monthIndex) => {
      const value = sumMonth(
        allExpenseItems,
        monthIndex,
      );
      const revenue = monthlyRevenueDenominators[monthIndex];

      return [
        value,
        revenue === 0 ? 0 : value / revenue,
      ];
    }).flat(),
  ]);

  rows.push([]);

  /*
   * GROSS OPERATING PROFIT
   */
  const ytdGrossOperatingProfit =
    ytdRevenueDenominator -
    ytdCostTotal -
    ytdExpenseTotal;

  rows.push([
    "GROSS OPERATING PROFIT",
    ytdGrossOperatingProfit,
    ytdRevenueDenominator === 0
      ? 0
      : ytdGrossOperatingProfit / ytdRevenueDenominator,
    ...Array.from({ length: 12 }, (_, monthIndex) => {
      const revenue = monthlyRevenueDenominators[monthIndex];
      const cost = sumMonth(costItems, monthIndex);
      const expense = sumMonth(
        allExpenseItems,
        monthIndex,
      );
      const profit = revenue - cost - expense;

      return [
        profit,
        revenue === 0 ? 0 : profit / revenue,
      ];
    }).flat(),
  ]);

  rows.push([]);

  /*
   * NON OPERATING EXPENSES
   */
  const ytdNonOperatingTotal = sumYtd(nonOperatingItems);

  rows.push([
    "NON OPERATING EXPENSES",
    ytdNonOperatingTotal,
    ytdRevenueDenominator === 0
      ? 0
      : ytdNonOperatingTotal / ytdRevenueDenominator,
    ...Array.from({ length: 12 }, (_, monthIndex) => {
      const value = sumMonth(
        nonOperatingItems,
        monthIndex,
      );
      const revenue = monthlyRevenueDenominators[monthIndex];

      return [
        value,
        revenue === 0 ? 0 : value / revenue,
      ];
    }).flat(),
  ]);

  rows.push([]);

  /*
   * NET RETURN
   */
  const ytdNetReturn =
    ytdGrossOperatingProfit -
    ytdNonOperatingTotal;

  rows.push([
    "NET RETURN",
    ytdNetReturn,
    ytdRevenueDenominator === 0
      ? 0
      : ytdNetReturn / ytdRevenueDenominator,
    ...Array.from({ length: 12 }, (_, monthIndex) => {
      const revenue = monthlyRevenueDenominators[monthIndex];
      const cost = sumMonth(costItems, monthIndex);
      const expense = sumMonth(
        allExpenseItems,
        monthIndex,
      );
      const nonOperating = sumMonth(
        nonOperatingItems,
        monthIndex,
      );

      const netReturn =
        revenue -
        cost -
        expense -
        nonOperating;

      return [
        netReturn,
        revenue === 0 ? 0 : netReturn / revenue,
      ];
    }).flat(),
  ]);

  /*
   * Worksheet.
   *
   * Referensi:
   * A  = 30.5546875
   * B  = 20
   * C  = 9.33203125
   * D/F/H/... = 16
   * E/G/I/... = 8
   * AB = spacer.
   */
  const worksheet = createSheet(
    rows,
    [
      30.5546875,
      20,
      9.33203125,
      16,
      8,
      16,
      8,
      16,
      8,
      16,
      8,
      16,
      8,
      16,
      8,
      16,
      8,
      16,
      8,
      16,
      9.109375,
      16,
      8,
      16,
      8,
      16,
      8,
      1.109375,
    ],
  );

  /*
   * Tambahkan satu kolom spacer setelah Desember.
   */
  for (let row = 0; row < rows.length; row += 1) {
    const address = XLSX.utils.encode_cell({
      r: row,
      c: 27,
    });

    if (!worksheet[address]) {
      worksheet[address] = {
        v: "",
        t: "s",
      };
    }
  }

  worksheet["!merges"] = [
    { s: { r: 0, c: 1 }, e: { r: 0, c: 2 } },
    { s: { r: 0, c: 3 }, e: { r: 0, c: 4 } },
    { s: { r: 0, c: 5 }, e: { r: 0, c: 6 } },
    { s: { r: 0, c: 7 }, e: { r: 0, c: 8 } },
    { s: { r: 0, c: 9 }, e: { r: 0, c: 10 } },
    { s: { r: 0, c: 11 }, e: { r: 0, c: 12 } },
    { s: { r: 0, c: 13 }, e: { r: 0, c: 14 } },
    { s: { r: 0, c: 15 }, e: { r: 0, c: 16 } },
    { s: { r: 0, c: 17 }, e: { r: 0, c: 18 } },
    { s: { r: 0, c: 19 }, e: { r: 0, c: 20 } },
    { s: { r: 0, c: 21 }, e: { r: 0, c: 22 } },
    { s: { r: 0, c: 23 }, e: { r: 0, c: 24 } },
    { s: { r: 0, c: 25 }, e: { r: 0, c: 26 } },
  ];

  const thin = {
    style: "thin" as const,
    color: "000000",
  };

  const medium = {
    style: "medium" as const,
    color: "000000",
  };

  const moneyFmt =
    '_(* #,##0_);_(* \\(#,##0\\);_(* "-"??_);_(@_)';

  const pctFmt =
    '_(* #,##0.00%_);_(* \\(#,##0\\);_(* "-"??_);_(@_)';

  const specialRows = new Map<number, string>([
    [9, "D5F0B1"],
    [16, "F5C4CE"],
    [28, "EBCAA0"],
    [30, "BDEDB9"],
    [34, "BDEDB9"],
  ]);

  /*
   * Base font, alignment, number format.
   * Data rows tidak diberi full grid karena workbook referensi
   * hanya menggunakan border pada header dan total/result rows.
   */
  for (let r = 1; r <= rows.length; r += 1) {
    for (let c = 1; c <= 28; c += 1) {
      const address = XLSX.utils.encode_cell({
        r: r - 1,
        c: c - 1,
      });

      const cell =
        worksheet[address] ??
        ({ v: "", t: "s" } as XLSX.CellObject);

      worksheet[address] = cell;

      const isLabel = c === 1;
      const isMoney =
        c === 2 ||
        (c >= 4 && c <= 27 && c % 2 === 0);
      const isPercent =
        c === 3 ||
        (c >= 5 && c <= 27 && c % 2 === 1);

      cell.s = {
        ...(cell.s ?? {}),
        font: {
          name: "Calibri",
          sz: 11,
          bold: r === 1 || specialRows.has(r) ||
            [2, 10, 17].includes(r),
          color: "000000",
        },
        alignment: {
          vertical: "center",
          horizontal: isLabel ? "left" : "right",
        },
      };

      if (isMoney) {
        cell.z = moneyFmt;
      } else if (isPercent) {
        cell.z = pctFmt;
      }

      /*
       * Border vertikal mengikuti workbook referensi.
       *
       * A       : kiri
       * B       : kiri medium + kanan
       * C       : kiri + kanan medium
       * D,F,H...: kanan saja
       * E,G,I...: kiri + kanan
       */
      const verticalBorder = {
        ...(c === 1 ? { left: thin } : {}),
        ...(c === 2
          ? {
              left: medium,
              right: thin,
            }
          : {}),
        ...(c === 3
          ? {
              left: thin,
              right: medium,
            }
          : {}),
        ...(c >= 4 && c <= 27
          ? c % 2 === 0
            ? { right: thin }
            : {
                left: thin,
                right: thin,
              }
          : {}),
      };

      cell.s.border = {
        ...(cell.s.border ?? {}),
        ...verticalBorder,
      };

      if (r === 1) {
        cell.s.border = {
          ...(cell.s.border ?? {}),
          top: c === 2 || c === 3 ? medium : thin,
          bottom: thin,
        };
      }

      if (specialRows.has(r)) {
        cell.s = {
          ...(cell.s ?? {}),
          fill: {
            fgColor: {
              rgb: specialRows.get(r)!,
            },
          },
          font: {
            name: "Calibri",
            sz: 11,
            bold: true,
            color: "000000",
          },
          border: {
            ...(cell.s.border ?? {}),
            top: thin,
            bottom: r === 34 ? medium : thin,
          },
        };
      }
    }
  }

  /*
   * Header: hanya teks dan border, tanpa fill.
   * A1 adalah label utama.
   * Group header bulanan mengikuti merge persis workbook referensi.
   */
  for (let c = 1; c <= 28; c += 1) {
    const address = XLSX.utils.encode_cell({
      r: 0,
      c: c - 1,
    });

    const cell =
      worksheet[address] ??
      ({ v: "", t: "s" } as XLSX.CellObject);

    worksheet[address] = cell;

    const border = {
      ...(cell.s?.border ?? {}),
      top: thin,
      bottom: thin,
    } as Record<string, unknown>;

    if (c === 2) {
      border.left = medium;
    }

    if (c === 3) {
      border.right = thin;
    }

    cell.s = {
      ...(cell.s ?? {}),
      font: {
        name: "Calibri",
        sz: 11,
        bold: true,
        color: "000000",
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: true,
      },
      border,
    };
  }

  /* Header group borders sudah diterapkan pada base style di atas. */

  /*
   * Section labels: bold, tanpa fill/border.
   */
  for (const rowNumber of [2, 10, 17]) {
    const cell = worksheet[`A${rowNumber}`];

    if (!cell) continue;

    cell.s = {
      ...(cell.s ?? {}),
      font: {
        name: "Calibri",
        sz: 11,
        bold: true,
        color: "000000",
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
      },
    };
  }

  /*
   * Total/result rows.
   * Vertical border tetap mengikuti map referensi:
   * B kiri medium, C kanan medium, D/F/H... kanan saja,
   * E/G/I... kiri + kanan.
   */
  for (const rowNumber of specialRows.keys()) {
    for (let c = 1; c <= 27; c += 1) {
      const address = XLSX.utils.encode_cell({
        r: rowNumber - 1,
        c: c - 1,
      });

      const cell = worksheet[address];

      if (!cell) continue;

      cell.s = {
        ...(cell.s ?? {}),
        fill: {
          fgColor: {
            rgb: specialRows.get(rowNumber)!,
          },
        },
        font: {
          name: "Calibri",
          sz: 11,
          bold: true,
          color: "000000",
        },
        border: {
          ...(cell.s?.border ?? {}),
          top: thin,
          bottom: rowNumber === 34 ? medium : thin,
        },
      };
    }
  }

  /*
   * AB = spacer. Tidak ada fill/border.
   */
  for (let r = 1; r <= rows.length; r += 1) {
    const cell = worksheet[
      XLSX.utils.encode_cell({
        r: r - 1,
        c: 27,
      })
    ];

    if (!cell) continue;

    cell.s = {
      ...(cell.s ?? {}),
      fill: undefined,
      border: undefined,
    };
  }

  return worksheet;
}

/**
 * Sheet Income Statement.
 *
 * Untuk tahap pertama generator, sheet ini menggunakan
 * data MACRO sebagai sumber konsolidasi P&L.
 *
 * Formula/engine Income Statement existing tidak diubah.
 */
function buildIncomeStatementSheet(
  macroRows: MisMacroExportRow[],
  year: number,
  month: number,
): XLSX.WorkSheet {
  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];

  const monthName = monthNames[month - 1] ?? "";
  const previousMonthName = monthNames[(month - 2 + 12) % 12] ?? "";

  /*
   * Income Statement memakai SUMMARY ACCOUNT, bukan seluruh detail akun.
   * Kode akun menjadi sumber grouping agar tidak bergantung pada nomor row MACRO.
   */
  const byCode = (code: string) =>
    macroRows.find((row) => row.account_code === code);

  const byPrefix = (prefix: string) =>
    macroRows.filter((row) => row.account_code.startsWith(prefix));


  const sumFormula = (
    items: MisMacroExportRow[],
    macroColumn: string,
  ): XLSX.CellObject => {
    const refs = items
      .map((item) => {
        const macroRow = macroRows.indexOf(item) + 6;
        return `MACRO!${macroColumn}${macroRow}`;
      });

    return formulaCell(
      refs.length > 0 ? `SUM(${refs.join(",")})` : "0",
    );
  };


  type SummaryLine = {
    label: string;
    codes?: string[];
    prefix?: string;
  };

  const revenueLines: SummaryLine[] = [
    { label: "Food Revenue", codes: ["411101"] },
    { label: "Beverage Revenue", codes: ["411102"] },
    { label: "Other Revenue", codes: ["411103"] },
    { label: "Adjustment & Rebate - Food", codes: ["411201"] },
    { label: "Adjustment & Rebate - Beverage", codes: ["411202"] },
  ];

  const cogsLines: SummaryLine[] = [
    { label: "Cost of Food", codes: ["511101"] },
    { label: "Cost of Beverage", codes: ["511102"] },
    { label: "Beban Pembelian Non-Stok", codes: ["511103"] },
    { label: "Beban Selisih Stok", codes: ["511104"] },
  ];

  const operatingLines: SummaryLine[] = [
    { label: "F&B", prefix: "611" },
    { label: "BAR", prefix: "621" },
    { label: "PAYROLL RELATED EXPENSES", prefix: "631" },
    { label: "A&G EXPENSES", prefix: "641" },
    { label: "SALES DESIGN EXPENSES", prefix: "651" },
    { label: "SERVICE EXPENSES", prefix: "661" },
    { label: "HRD EXPENSES", prefix: "671" },
    { label: "POMEC EXPENSES", prefix: "681" },
    { label: "ENERGY", prefix: "691" },
  ];

  const nonOperatingLines: SummaryLine[] = [
    { label: "Land & Rent", codes: ["711101"] },
    { label: "Depreciation", codes: ["711107"] },
  ];

  const itemsForLine = (line: SummaryLine) => {
    if (line.codes) {
      return line.codes
        .map((code) => byCode(code))
        .filter((item): item is MisMacroExportRow => Boolean(item));
    }
    return byPrefix(line.prefix ?? "");
  };

  const ratioFormula = (
    valueColumn: string,
    row: number,
    totalColumn: string,
  ) =>
    formulaCell(
      `IF(${totalColumn}${revenueTotalRow}=0,0,${valueColumn}${row}/${totalColumn}${revenueTotalRow})`,
    );

  /*
   * Row 9 is intentionally fixed by the SUMMARY layout:
   * row 3 REVENUE, rows 4-8 five summary accounts, row 9 TOTAL REVENUE.
   */
  const revenueTotalRow = 9;

  const rows: unknown[][] = [
    [
      `${previousMonthName.toUpperCase()} ${month === 1 ? year - 1 : year}`,
      null,
      `${monthName.toUpperCase()} ${year - 1}`,
      null,
      `BUDGET ${monthName.toUpperCase()} ${year}`,
      null,
      `${monthName.toUpperCase()} ${year}`,
      null,
      "DESCRIPTION",
      `JANUARI - ${monthName.toUpperCase()} ${year - 1}`,
      null,
      `BUDGET JANUARI - ${monthName.toUpperCase()} ${year}`,
      null,
      `JANUARI - ${monthName.toUpperCase()} ${year}`,
      null,
    ],
    [
      "ACTUAL", "% OF TR", "ACTUAL", "% OF TR", "BUDGET", "% OF TR",
      "ACTUAL", "% OF TR", null, "ACTUAL", "% OF TR",
      "BUDGET", "% OF TR", "ACTUAL", "% OF TR",
    ],
  ];

  const sectionRows: number[] = [];
  const totalRows: number[] = [];
  const blueTotalRows: number[] = [];
  const greenTotalRows: number[] = [];

  const pushSection = (title: string) => {
    const row = rows.length + 1;
    sectionRows.push(row);
    rows.push([
      null, null, null, null, null, null, null, null,
      title, null, null, null, null, null, null,
    ]);
  };

  const pushSummaryLine = (line: SummaryLine) => {
    const row = rows.length + 1;
    const items = itemsForLine(line);

    rows.push([
      sumFormula(items, "D"),
      ratioFormula("A", row, "A"),
      sumFormula(items, "G"),
      ratioFormula("C", row, "C"),
      sumFormula(items, "F"),
      ratioFormula("E", row, "E"),
      sumFormula(items, "E"),
      ratioFormula("G", row, "G"),
      line.label,
      sumFormula(items, "J"),
      ratioFormula("J", row, "J"),
      sumFormula(items, "I"),
      ratioFormula("L", row, "L"),
      sumFormula(items, "H"),
      ratioFormula("N", row, "N"),
    ]);
  };

  const pushTotal = (
    label: string,
    sourceLines: SummaryLine[],
    blue = false,
  ) => {
    const row = rows.length + 1;
    const items = sourceLines.flatMap(itemsForLine);

    rows.push([
      sumFormula(items, "D"),
      ratioFormula("A", row, "A"),
      sumFormula(items, "G"),
      ratioFormula("C", row, "C"),
      sumFormula(items, "F"),
      ratioFormula("E", row, "E"),
      sumFormula(items, "E"),
      ratioFormula("G", row, "G"),
      label,
      sumFormula(items, "J"),
      ratioFormula("J", row, "J"),
      sumFormula(items, "I"),
      ratioFormula("L", row, "L"),
      sumFormula(items, "H"),
      ratioFormula("N", row, "N"),
    ]);

    totalRows.push(row);
    if (blue) blueTotalRows.push(row);
    else greenTotalRows.push(row);

    return row;
  };

  pushSection("REVENUE");
  for (const line of revenueLines) pushSummaryLine(line);
  pushTotal("TOTAL REVENUE", revenueLines, true);

  pushSection("COST OF SALES");
  for (const line of cogsLines) pushSummaryLine(line);
  pushTotal("TOTAL COST OF SALES", cogsLines, false);

  pushSection("OPERATING & OTHER EXPENSES");
  for (const line of operatingLines) pushSummaryLine(line);
  pushTotal("TOTAL OPERATING & OTHER EXPENSES", operatingLines, false);

  const grossProfitRow = rows.length + 1;
  rows.push([
    formulaCell(`A${revenueTotalRow}-A15-A26`),
    formulaCell(`IF(A${revenueTotalRow}=0,0,A${grossProfitRow}/A${revenueTotalRow})`),
    formulaCell(`C${revenueTotalRow}-C15-C26`),
    formulaCell(`IF(C${revenueTotalRow}=0,0,C${grossProfitRow}/C${revenueTotalRow})`),
    formulaCell(`E${revenueTotalRow}-E15-E26`),
    formulaCell(`IF(E${revenueTotalRow}=0,0,E${grossProfitRow}/E${revenueTotalRow})`),
    formulaCell(`G${revenueTotalRow}-G15-G26`),
    formulaCell(`IF(G${revenueTotalRow}=0,0,G${grossProfitRow}/G${revenueTotalRow})`),
    "GROSS OPERATING PROFIT",
    formulaCell(`J${revenueTotalRow}-J15-J26`),
    formulaCell(`IF(J${revenueTotalRow}=0,0,J${grossProfitRow}/J${revenueTotalRow})`),
    formulaCell(`L${revenueTotalRow}-L15-L26`),
    formulaCell(`IF(L${revenueTotalRow}=0,0,L${grossProfitRow}/L${revenueTotalRow})`),
    formulaCell(`N${revenueTotalRow}-N15-N26`),
    formulaCell(`IF(N${revenueTotalRow}=0,0,N${grossProfitRow}/N${revenueTotalRow})`),
  ]);
  totalRows.push(grossProfitRow);
  blueTotalRows.push(grossProfitRow);

  pushSection("NON OPERATING EXPENSES");
  for (const line of nonOperatingLines) pushSummaryLine(line);
  const nonOperatingTotalRow = rows.length + 1;
  pushTotal("TOTAL NON OPERATING EXPENSES", nonOperatingLines, false);

  const netResultRow = rows.length + 1;
  rows.push([
    formulaCell(`A${grossProfitRow}-A${nonOperatingTotalRow}`),
    formulaCell(`IF(A${revenueTotalRow}=0,0,A${netResultRow}/A${revenueTotalRow})`),
    formulaCell(`C${grossProfitRow}-C${nonOperatingTotalRow}`),
    formulaCell(`IF(C${revenueTotalRow}=0,0,C${netResultRow}/C${revenueTotalRow})`),
    formulaCell(`E${grossProfitRow}-E${nonOperatingTotalRow}`),
    formulaCell(`IF(E${revenueTotalRow}=0,0,E${netResultRow}/E${revenueTotalRow})`),
    formulaCell(`G${grossProfitRow}-G${nonOperatingTotalRow}`),
    formulaCell(`IF(G${revenueTotalRow}=0,0,G${netResultRow}/G${revenueTotalRow})`),
    "NET RESULT",
    formulaCell(`J${grossProfitRow}-J${nonOperatingTotalRow}`),
    formulaCell(`IF(J${revenueTotalRow}=0,0,J${netResultRow}/J${revenueTotalRow})`),
    formulaCell(`L${grossProfitRow}-L${nonOperatingTotalRow}`),
    formulaCell(`IF(L${revenueTotalRow}=0,0,L${netResultRow}/L${revenueTotalRow})`),
    formulaCell(`N${grossProfitRow}-N${nonOperatingTotalRow}`),
    formulaCell(`IF(N${revenueTotalRow}=0,0,N${netResultRow}/N${revenueTotalRow})`),
  ]);
  totalRows.push(netResultRow);
  blueTotalRows.push(netResultRow);

  const worksheet = createSheet(rows, [
    17.77734375, 11.77734375, 17.77734375, 11.77734375,
    18.77734375, 11.77734375, 17.77734375, 11.77734375,
    34.44140625, 19.77734375, 11.77734375, 20.77734375,
    11.77734375, 19.77734375, 11.77734375,
  ]);

  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 0, c: 2 }, e: { r: 0, c: 3 } },
    { s: { r: 0, c: 4 }, e: { r: 0, c: 5 } },
    { s: { r: 0, c: 6 }, e: { r: 0, c: 7 } },
    { s: { r: 0, c: 8 }, e: { r: 1, c: 8 } },
    { s: { r: 0, c: 9 }, e: { r: 0, c: 10 } },
    { s: { r: 0, c: 11 }, e: { r: 0, c: 12 } },
    { s: { r: 0, c: 13 }, e: { r: 0, c: 14 } },
  ];

  const thin = { style: "thin" as const, color: "000000" };
  const green = "ABF59F";
  const blue = "6BBAF2";
  const yellow = "EBD89B";
  const moneyFmt = '_(* #,##0_);_(* \\(#,##0\\);_(* "-"??_);_(@_)';
  const pctFmt = '0.00%;[Red](0.00%);-';

  for (let r = 1; r <= rows.length; r += 1) {
    for (let c = 1; c <= 15; c += 1) {
      const address = XLSX.utils.encode_cell({ r: r - 1, c: c - 1 });
      const cell = worksheet[address] ?? ({ v: "", t: "s" } as XLSX.CellObject);
      worksheet[address] = cell;
      const isNumeric = c !== 9;
      cell.s = {
        ...(cell.s ?? {}),
        font: {
          name: "Calibri",
          sz: 11,
          bold: r <= 3 || sectionRows.includes(r) || totalRows.includes(r),
          color: blueTotalRows.includes(r) ? { rgb: "FF0000FF" } : { rgb: "FF000000" },
        },
        alignment: {
          horizontal: c === 9 ? "center" : "right",
          vertical: "center",
        },
        border: {
          ...(cell.s?.border ?? {}),
          left: thin,
          right: thin,
        },
      };
      if (isNumeric) {
        cell.z = [1,3,5,7,10,12,14].includes(c)
          ? moneyFmt
          : pctFmt;
      }
    }
  }

  // Header: seluruh header seragam hijau, DESCRIPTION biru.
  for (let r = 1; r <= 2; r += 1) {
    for (let c = 1; c <= 15; c += 1) {
      const address = XLSX.utils.encode_cell({ r: r - 1, c: c - 1 });
      const cell = worksheet[address]!;
      cell.s = {
        ...(cell.s ?? {}),
        font: { name: "Calibri", sz: 11, bold: true, color: "000000" },
        fill: { fgColor: { rgb: green } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: { top: thin, bottom: thin, left: thin, right: thin },
      };
    }
  }

  // Section: blue only on DESCRIPTION cell, as in the corrected workbook.
  for (const r of sectionRows) {
    for (let c = 1; c <= 15; c += 1) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: r - 1, c: c - 1 })]!;
      cell.s = {
        ...(cell.s ?? {}),
        font: { name: "Calibri", sz: 11, bold: true, color: "000000" },
        fill: { fgColor: { rgb: c === 9 ? blue : "FFFFFF" } },
        border: { ...(cell.s?.border ?? {}), top: thin, bottom: thin, left: thin, right: thin },
      };
    }
  }

  // Summary account label cells are green.
  for (let r = 1; r <= rows.length; r += 1) {
    const label = worksheet[XLSX.utils.encode_cell({ r: r - 1, c: 8 })];
    if (label && typeof label.v === "string" &&
        !sectionRows.includes(r) &&
        !totalRows.includes(r) &&
        r > 3) {
      label.s = {
        ...(label.s ?? {}),
        fill: { fgColor: { rgb: green } },
        font: { name: "Calibri", sz: 11, bold: true, color: "000000" },
        border: { left: thin, right: thin },
      };
    }
  }

  // Totals: yellow fill only on DESCRIPTION; numeric totals stay white.
  for (const r of greenTotalRows) {
    const label = worksheet[XLSX.utils.encode_cell({ r: r - 1, c: 8 })];
    if (label) {
      label.s = {
        ...(label.s ?? {}),
        fill: { fgColor: { rgb: green } },
        font: { name: "Calibri", sz: 11, bold: true, color: "000000" },
        border: { top: thin, bottom: thin, left: thin, right: thin },
      };
    }
  }

  for (const r of blueTotalRows) {
    for (let c = 1; c <= 15; c += 1) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: r - 1, c: c - 1 })]!;
      cell.s = {
        ...(cell.s ?? {}),
        font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FF0000FF" } },
        fill: { fgColor: { rgb: c === 9 ? yellow : "FFFFFF" } },
        border: { ...(cell.s?.border ?? {}), top: thin, bottom: thin },
      };
    }
  }

  // Total rows that are not blue: border + black font, green DESCRIPTION.
  for (const r of greenTotalRows) {
    for (let c = 1; c <= 15; c += 1) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: r - 1, c: c - 1 })]!;
      cell.s = {
        ...(cell.s ?? {}),
        font: { name: "Calibri", sz: 11, bold: true, color: "000000" },
        border: { ...(cell.s?.border ?? {}), top: thin, bottom: thin },
      };
    }
  }

  addFreezePane(worksheet, 2, 9);
  return worksheet;
}

function buildBalanceSheetSheet(
  rows: MisBalanceSheetRow[],
  year: number,
  month: number,
): XLSX.WorkSheet {
  const lastDay = new Date(year, month, 0).getDate();

  const assets = rows.filter((row) => row.category_code === "ASSET");
  const liabilities = rows.filter((row) => row.category_code === "LIABILITY");
  const equity = rows.filter((row) => row.category_code === "EQUITY");
  const currentProfit = rows.find(
    (row) => row.category_code === "CURRENT_PROFIT" ||
      row.account_code === "321103" ||
      /profit\s*&\s*loss|laba.*rugi/i.test(row.account_name),
  );

  const nonZero = (row: MisBalanceSheetRow) =>
    Math.abs(numberValue(row.amount)) > 0.0000001;

  /*
   * CURRENT ASSET:
   * gunakan data balanceSheetRows yang sudah dikonsolidasikan engine,
   * lalu tampilkan hanya saldo non-zero.
   */
  const currentAssets = assets.filter((row) => {
    const code = row.account_code.trim();
    return (
      nonZero(row) &&
      !code.startsWith("16") &&
      !code.startsWith("17") &&
      !code.startsWith("18")
    );
  });

  /*
   * FIXED ASSET & OPR EQP:
   * 160xxx = Fixed Assets,
   * 170xxx/171xxx = accumulated depreciation & FF&E,
   * 180xxx = Operating Equipment.
   *
   * Acc. Depr hanya muncul jika ada saldo dan ditempatkan setelah
   * asset terkait bila nama asset-nya dapat dipasangkan.
   */
  const fixedAssets = assets.filter((row) => {
    const code = row.account_code.trim();
    return (
      nonZero(row) &&
      (code.startsWith("16") ||
        code.startsWith("17") ||
        code.startsWith("18"))
    );
  });

  const isAccumulatedDepreciation = (row: MisBalanceSheetRow) =>
    /acc\.?\s*depr/i.test(row.account_name);

  const fixedNormal = fixedAssets.filter(
    (row) => !isAccumulatedDepreciation(row),
  );
  const fixedDepr = fixedAssets.filter(isAccumulatedDepreciation);

  const depreciationFor = (asset: MisBalanceSheetRow) => {
    const assetName = asset.account_name
      .replace(/^Opr\.\s*Eqp\s*-\s*/i, "")
      .replace(/^FF&E\s*-\s*/i, "")
      .trim()
      .toLowerCase();

    return fixedDepr.filter((row) => {
      const deprName = row.account_name
        .replace(/^acc\.?\s*depr\s*-\s*/i, "")
        .replace(/^acc\.?\s*depr\s*/i, "")
        .replace(/^ff&e\s*-\s*/i, "")
        .trim()
        .toLowerCase();

      return deprName.includes(assetName) || assetName.includes(deprName);
    });
  };

  const fixedOrdered: MisBalanceSheetRow[] = [];
  const usedDepr = new Set<string>();

  for (const asset of fixedNormal) {
    fixedOrdered.push(asset);
    for (const depr of depreciationFor(asset)) {
      fixedOrdered.push(depr);
      if (depr.account_id) usedDepr.add(depr.account_id);
    }
  }

  for (const depr of fixedDepr) {
    if (!depr.account_id || !usedDepr.has(depr.account_id)) {
      fixedOrdered.push(depr);
    }
  }

  const currentLiabilities = liabilities.filter(nonZero);
  const capitalRows = equity.filter(
    (row) => nonZero(row) && row !== currentProfit,
  );

  const totalCurrentAssets = currentAssets.reduce(
    (sum, row) => sum + numberValue(row.amount),
    0,
  );
  const totalFixedAssets = fixedOrdered.reduce(
    (sum, row) => sum + numberValue(row.amount),
    0,
  );
  const totalAssets = totalCurrentAssets + totalFixedAssets;

  const totalCurrentLiabilities = currentLiabilities.reduce(
    (sum, row) => sum + numberValue(row.amount),
    0,
  );
  const totalEquity = capitalRows.reduce(
    (sum, row) => sum + numberValue(row.amount),
    0,
  );
  const currentProfitAmount = numberValue(currentProfit?.amount);
  const totalCapital = totalEquity + currentProfitAmount;
  const totalLiabilitiesAndCapital =
    totalCurrentLiabilities + totalCapital;
  const difference = totalAssets - totalLiabilitiesAndCapital;

  const data: unknown[][] = [
    [
      `Balance Sheet Period of ${String(lastDay).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`,
      null, null, null,
    ],
    ["ASSET", "Nominal(Rp)", "LIABILITIES & CAPITAL", "Nominal(Rp)"],
    ["CURRENT ASSET", null, "CURRENT LIABILITIES", null],
  ];

  const maxInitialRows = Math.max(
    currentAssets.length,
    currentLiabilities.length,
  );

  for (let index = 0; index < maxInitialRows; index += 1) {
    const asset = currentAssets[index];
    const liability = currentLiabilities[index];

    data.push([
      asset?.account_name ?? "",
      asset ? formatNumber(asset.amount) : null,
      liability?.account_name ?? "",
      liability ? formatNumber(liability.amount) : null,
    ]);
  }

  data.push([
    "TOTAL CURRENT ASSETS",
    formatNumber(totalCurrentAssets),
    "",
    null,
  ]);

  data.push([
    "",
    null,
    "TOTAL CURRENT LIABILITIES",
    formatNumber(totalCurrentLiabilities),
  ]);

  data.push([
    "FIXED ASSET & OPR EQP",
    null,
    "CAPITAL",
    null,
  ]);

  /*
   * Setelah current asset selesai, fixed asset dimulai di sisi kiri.
   * Sisi kanan melanjutkan capital seperti template.
   */
  const maxFixedCapitalRows = Math.max(
    fixedOrdered.length,
    capitalRows.length + (currentProfit ? 1 : 0),
  );

  for (let index = 0; index < maxFixedCapitalRows; index += 1) {
    const asset = fixedOrdered[index];
    const capital =
      capitalRows[index] ??
      (index === capitalRows.length ? currentProfit : undefined);

    data.push([
      asset?.account_name ?? "",
      asset ? formatNumber(asset.amount) : null,
      capital?.account_name ??
        (capital === currentProfit
          ? "Laba (Rugi) Periode Berjalan"
          : ""),
      capital ? formatNumber(capital.amount) : null,
    ]);
  }

  data.push([
    "TOTAL FIXED ASSETS & OPR EQP",
    formatNumber(totalFixedAssets),
    "TOTAL CAPITAL",
    formatNumber(totalCapital),
  ]);

  data.push(["", null, "", null]);

  data.push([
    "TOTAL ASSETS",
    formatNumber(totalAssets),
    "TOTAL LIABILITIES & CAPITAL",
    formatNumber(totalLiabilitiesAndCapital),
  ]);

  data.push([
    "BALANCE CHECK",
    formatNumber(difference),
    "",
    null,
  ]);

  const worksheet = createSheet(data, [
    43.77734375,
    18.77734375,
    43.77734375,
    18.77734375,
  ]);

  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
  ];

  const thin = { style: "thin" as const, color: "000000" };

  for (let r = 1; r <= data.length; r += 1) {
    for (let c = 1; c <= 4; c += 1) {
      const address = XLSX.utils.encode_cell({ r: r - 1, c: c - 1 });
      const cell =
        worksheet[address] ?? ({ v: "", t: "s" } as XLSX.CellObject);
      worksheet[address] = cell;

      cell.s = {
        ...(cell.s ?? {}),
        font: { name: "Calibri", sz: 11, color: "000000" },
        border: { top: thin, bottom: thin, left: thin, right: thin },
        alignment: {
          vertical: "center",
          horizontal: c === 2 || c === 4 ? "right" : "left",
        },
      };
    }
  }

  if (worksheet.A1) {
    worksheet.A1.s = {
      ...(worksheet.A1.s ?? {}),
      font: { name: "Calibri", sz: 14, bold: true, color: "000000" },
      alignment: { horizontal: "center", vertical: "center" },
    };
  }

  // Header ASSET / LIABILITIES & CAPITAL.
  for (let c = 1; c <= 4; c += 1) {
    const cell = worksheet[
      XLSX.utils.encode_cell({ r: 1, c: c - 1 })
    ];
    if (!cell) continue;
    cell.s = {
      ...(cell.s ?? {}),
      font: { name: "Calibri", sz: 11, bold: true, color: "000000" },
      fill: { fgColor: { rgb: "ABF59F" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: { top: thin, bottom: thin, left: thin, right: thin },
    };
  }

  const sectionLabels = new Set([
    "CURRENT ASSET",
    "CURRENT LIABILITIES",
    "FIXED ASSET & OPR EQP",
    "CAPITAL",
  ]);

  const greenTotals = new Set([
    "TOTAL CURRENT ASSETS",
  ]);

  const yellowTotals = new Set([
    "TOTAL FIXED ASSETS & OPR EQP",
    "TOTAL CURRENT LIABILITIES",
    "TOTAL CAPITAL",
    "TOTAL ASSETS",
    "TOTAL LIABILITIES & CAPITAL",
  ]);

  for (let r = 1; r <= data.length; r += 1) {
    for (const c of [1, 3]) {
      const cell = worksheet[
        XLSX.utils.encode_cell({ r: r - 1, c: c - 1 })
      ];
      if (!cell || typeof cell.v !== "string") continue;

      if (sectionLabels.has(cell.v)) {
        for (let tc = 1; tc <= 4; tc += 1) {
          const target = worksheet[
            XLSX.utils.encode_cell({ r: r - 1, c: tc - 1 })
          ];
          if (!target) continue;
          target.s = {
            ...(target.s ?? {}),
            font: { name: "Calibri", sz: 11, bold: true, color: "000000" },
            border: { ...(target.s?.border ?? {}), top: thin, bottom: thin, left: thin, right: thin },
          };
        }
      }

      if (greenTotals.has(cell.v)) {
        for (let tc = 1; tc <= 2; tc += 1) {
          const target = worksheet[
            XLSX.utils.encode_cell({ r: r - 1, c: tc - 1 })
          ];
          if (!target) continue;
          target.s = {
            ...(target.s ?? {}),
            font: { name: "Calibri", sz: 11, bold: true, color: "000000" },
            fill: { fgColor: { rgb: "ABF59F" } },
            border: { top: thin, bottom: thin, left: thin, right: thin },
          };
        }
      }

      if (yellowTotals.has(cell.v)) {
        for (let tc = 1; tc <= 4; tc += 1) {
          const target = worksheet[
            XLSX.utils.encode_cell({ r: r - 1, c: tc - 1 })
          ];
          if (!target) continue;
          target.s = {
            ...(target.s ?? {}),
            font: { name: "Calibri", sz: 11, bold: true, color: "000000" },
            fill: { fgColor: { rgb: "F7F5BE" } },
            border: { top: thin, bottom: thin, left: thin, right: thin },
          };
        }
      }
    }
  }

  // Reference memakai warna biru untuk BALANCE CHECK.
  const balanceRow = data.length;
  for (let c = 1; c <= 4; c += 1) {
    const cell = worksheet[
      XLSX.utils.encode_cell({ r: balanceRow - 1, c: c - 1 })
    ];
    if (!cell) continue;
    cell.s = {
      ...(cell.s ?? {}),
      font: { name: "Calibri", sz: 11, bold: true, color: "000000" },
      fill: { fgColor: { rgb: "00B0F0" } },
      border: { top: thin, bottom: thin, left: thin, right: thin },
    };
  }

  const accountingFormat = '#,##0;[Red](#,##0);-';
  for (let r = 3; r <= data.length; r += 1) {
    for (const c of [2, 4]) {
      const cell = worksheet[
        XLSX.utils.encode_cell({ r: r - 1, c: c - 1 })
      ];
      if (cell) {
        cell.z = accountingFormat;
        cell.s = {
          ...(cell.s ?? {}),
          alignment: { horizontal: "right", vertical: "center" },
        };
      }
    }
  }

  return worksheet;
}

/**
 * F&B - P&L sesuai struktur workbook MIS referensi.
 * Seluruh angka utama mengambil sumber dari MACRO dan
 * persentase dihitung terhadap TOTAL REVENUE.
 */
function formulaCell(formula: string): XLSX.CellObject {
  return {
    t: "n",
    f: formula,
    v: 0,
  };
}

function buildFbPnlSheet(
  macroRows: MisMacroExportRow[],
): XLSX.WorkSheet {
  /*
   * F&B - P&L
   *
   * Layout mengikuti workbook MIS referensi yang sudah diperbaiki:
   *
   * A      = DESCRIPTION (merge A1:A2)
   * B:E    = CURRENT MONTH
   * F:G    = LAST MONTH
   * H:I    = LAST YEAR
   * J      = separator
   * K:N    = YEAR TO DATE
   * O:P    = LAST YEAR YTD
   *
   * Isi akun tetap DINAMIS dari macroRows.
   * Tidak ada nomor row MACRO yang hardcode.
   */
  const rows: unknown[][] = [];

  const set = (row: number, col: number, value: unknown) => {
    while (rows.length < row) {
      rows.push(Array(16).fill(null));
    }
    rows[row - 1][col - 1] = value;
  };

  const setFormula = (row: number, col: number, formula: string) => {
    set(row, col, formulaCell(formula));
  };

  const normalize = (value: unknown): string =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  /*
   * MACRO data selalu mulai Excel row 6.
   * Posisi dihitung dari macroRows, bukan dari workbook template.
   */
  const macroExcelRowByAccountId = new Map<string, number>();
  const macroExcelRowByAccountCode = new Map<string, number>();
  const macroExcelRowByName = new Map<string, number>();

  macroRows.forEach((item, index) => {
    const excelRow = index + 6;

    if (item.account_id) {
      macroExcelRowByAccountId.set(item.account_id, excelRow);
    }

    if (item.account_code) {
      macroExcelRowByAccountCode.set(item.account_code, excelRow);
    }

    const name = normalize(item.account_name);
    if (name && !macroExcelRowByName.has(name)) {
      macroExcelRowByName.set(name, excelRow);
    }
  });

  const macroRowFor = (item: MisMacroExportRow): number | null =>
    macroExcelRowByAccountId.get(item.account_id) ??
    macroExcelRowByAccountCode.get(item.account_code) ??
    macroExcelRowByName.get(normalize(item.account_name)) ??
    null;

  const findByName = (name: string): MisMacroExportRow | undefined => {
    const target = normalize(name);

    return macroRows.find(
      (item) => normalize(item.account_name) === target,
    );
  };

  /*
   * Kolom sumber MACRO:
   *
   * B = Actual MTD
   * D = Budget MTD
   * F = Last Month
   * H = Last Year
   * K = Actual YTD
   * M = Budget YTD
   * O = Last Year YTD
   */
  const groups: Array<[number, string]> = [
    [2, "E"],
    [4, "F"],
    [6, "D"],
    [8, "G"],
    [11, "H"],
    [13, "I"],
    [15, "J"],
  ];

  const revenueColumns: Array<[number, string]> = [
    [2, "B"],
    [4, "D"],
    [6, "F"],
    [8, "H"],
    [11, "K"],
    [13, "M"],
    [15, "O"],
  ];

  /*
   * ------------------------------------------------------------
   * HEADER
   * ------------------------------------------------------------
   */
  set(1, 1, "DESCRIPTION");
  set(1, 2, "CURRENT MONTH");
  set(1, 6, "LAST MONTH");
  set(1, 8, "LAST YEAR");
  set(1, 10, null);
  set(1, 11, "YEAR TO DATE");
  set(1, 15, "LAST YEAR YTD");

  set(2, 2, "ACTUAL");
  set(2, 3, "%");
  set(2, 4, "BUDGET");
  set(2, 5, "%");
  set(2, 6, "ACTUAL");
  set(2, 7, "%");
  set(2, 8, "ACTUAL");
  set(2, 9, "%");
  set(2, 11, "ACTUAL");
  set(2, 12, "%");
  set(2, 13, "BUDGET");
  set(2, 14, "%");
  set(2, 15, "ACTUAL");
  set(2, 16, "%");

  /*
   * ------------------------------------------------------------
   * STATISTIC
   * ------------------------------------------------------------
   */
  set(4, 1, "STATISTIC");

  const statisticDefinitions = [
    "No. of Table Available",
    "No. of Seat Available",
    "No. of Seat per Table",
    "No. of Parties",
    "Table Occupancy %",
    "Average Check per Guest",
  ];

  statisticDefinitions.forEach((label, index) => {
    const row = 5 + index;
    set(row, 1, label);

    const source = findByName(label);
    const macroRow = source ? macroRowFor(source) : null;

    if (macroRow !== null) {
      groups.forEach(([col, macroCol]) => {
        setFormula(row, col, `MACRO!${macroCol}${macroRow}`);
      });
    }
  });

  /*
   * ------------------------------------------------------------
   * HELPER UNTUK BARIS AKUN
   * ------------------------------------------------------------
   */
  const setMetricRow = (
    row: number,
    item: MisMacroExportRow,
    totalRevenueRow: number,
  ) => {
    const macroRow = macroRowFor(item);

    set(row, 1, item.account_name);

    if (macroRow === null) {
      return;
    }

    groups.forEach(([col, macroCol]) => {
      setFormula(row, col, `MACRO!${macroCol}${macroRow}`);

      const pctCol = col + 1;
      const revenueCol =
        revenueColumns.find(([valueCol]) => valueCol === col)?.[1];

      if (revenueCol) {
        setFormula(
          row,
          pctCol,
          `IF(${revenueCol}${totalRevenueRow}=0,0,${revenueCol}${row}/${revenueCol}${totalRevenueRow})`,
        );
      }
    });
  };

  /*
   * ------------------------------------------------------------
   * REVENUE
   * ------------------------------------------------------------
   *
   * Prioritas revenue F&B. Bila engine tidak memberikan division
   * FB pada revenue, fallback ke seluruh akun REVENUE.
   */
  const fbRevenue = macroRows.filter(
    (item) =>
      item.category_code === "REVENUE" &&
      item.division_code === "FB",
  );

  const allRevenue = macroRows.filter(
    (item) => item.category_code === "REVENUE",
  );

  const revenueItems = (
    fbRevenue.length > 0 ? fbRevenue : allRevenue
  ).slice(0, 3);

  const revenueStartRow = 11;

  const totalRevenueRow =
    revenueStartRow + Math.max(revenueItems.length, 1);

  revenueItems.forEach((item, index) => {
    setMetricRow(
      revenueStartRow + index,
      item,
      totalRevenueRow,
    );
  });

  set(totalRevenueRow, 1, "TOTAL REVENUE");

  revenueColumns.forEach(([col, letter]) => {
    const endRow = Math.max(
      totalRevenueRow - 1,
      revenueStartRow,
    );

    setFormula(
      totalRevenueRow,
      col,
      `SUM(${letter}${revenueStartRow}:${letter}${endRow})`,
    );

    setFormula(
      totalRevenueRow,
      col + 1,
      `IF(${letter}${totalRevenueRow}=0,0,${letter}${totalRevenueRow}/${letter}${totalRevenueRow})`,
    );
  });

  /*
   * ------------------------------------------------------------
   * EXPENSE
   * ------------------------------------------------------------
   */
  const getExpenseRows = (divisionCode: string) =>
    macroRows.filter(
      (item) =>
        item.division_code === divisionCode &&
        (item.category_code === "EXPENSE" ||
          item.category_code === "OTHER_EXPENSE"),
    );

  const boldRows = new Set<number>([1, 2, 4]);
  const sectionRows = new Set<number>();
  const totalRows = new Set<number>();

  const buildExpenseSection = (
    title: string,
    divisionCode: string,
    titleRow: number,
    totalLabel: string,
  ): number => {
    set(titleRow, 1, title);
    sectionRows.add(titleRow);
    boldRows.add(titleRow);

    const items = getExpenseRows(divisionCode);
    const dataStartRow = titleRow + 1;

    items.forEach((item, index) => {
      setMetricRow(
        dataStartRow + index,
        item,
        totalRevenueRow,
      );
    });

    const totalRow = dataStartRow + items.length;

    set(totalRow, 1, totalLabel);

    revenueColumns.forEach(([col, letter]) => {
      if (items.length > 0) {
        setFormula(
          totalRow,
          col,
          `SUM(${letter}${dataStartRow}:${letter}${totalRow - 1})`,
        );
      } else {
        setFormula(totalRow, col, "0");
      }

      setFormula(
        totalRow,
        col + 1,
        `IF(${letter}${totalRevenueRow}=0,0,${letter}${totalRow}/${letter}${totalRevenueRow})`,
      );
    });

    boldRows.add(totalRow);
    totalRows.add(totalRow);

    return totalRow;
  };

  boldRows.add(totalRevenueRow);
  totalRows.add(totalRevenueRow);

  const fbTitleRow = totalRevenueRow + 1;

  const fbTotalRow = buildExpenseSection(
    "F&B EXPENSES",
    "FB",
    fbTitleRow,
    "TOTAL F&B EXPENSES",
  );

  const barTitleRow = fbTotalRow + 1;

  const barTotalRow = buildExpenseSection(
    "BAR EXPENSES",
    "BAR",
    barTitleRow,
    "TOTAL BAR EXPENSES",
  );

  /*
   * ------------------------------------------------------------
   * DEPARTMENTAL PROFIT
   * ------------------------------------------------------------
   */
  const profitRow = barTotalRow + 1;

  set(profitRow, 1, "DEPARTMENTAL PROFIT (LOSS)");

  boldRows.add(profitRow);
  totalRows.add(profitRow);

  revenueColumns.forEach(([col, letter]) => {
    setFormula(
      profitRow,
      col,
      `${letter}${totalRevenueRow}-${letter}${fbTotalRow}-${letter}${barTotalRow}`,
    );

    setFormula(
      profitRow,
      col + 1,
      `IF(${letter}${totalRevenueRow}=0,0,${letter}${profitRow}/${letter}${totalRevenueRow})`,
    );
  });

  /*
   * ------------------------------------------------------------
   * WORKSHEET
   * ------------------------------------------------------------
   */
  const worksheet = createSheet(rows, [
    51.44, // A
    18.44, // B
    11.44, // C
    18.44, // D
    11.44, // E
    18.44, // F
    11.44, // G
    20.78, // H
    6.66,  // I
    2.00,  // J - separator
    20.78, // K
    12.55, // L
    20.78, // M
    11.44, // N
    20.78, // O
    11.44, // P
  ]);

  /*
   * Persis seperti workbook contoh:
   *
   * A1:A2  DESCRIPTION
   * B1:E1  CURRENT MONTH
   * F1:G1  LAST MONTH
   * H1:I1  LAST YEAR
   * J      separator
   * K1:N1  YEAR TO DATE
   * O1:P1  LAST YEAR YTD
   */
  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
    { s: { r: 0, c: 1 }, e: { r: 0, c: 4 } },
    { s: { r: 0, c: 5 }, e: { r: 0, c: 6 } },
    { s: { r: 0, c: 7 }, e: { r: 0, c: 8 } },
    { s: { r: 0, c: 10 }, e: { r: 0, c: 13 } },
    { s: { r: 0, c: 14 }, e: { r: 0, c: 15 } },
  ];

  const thin = {
    style: "thin" as const,
    color: "000000",
  };

  type BorderPatch = {
    top?: typeof thin;
    bottom?: typeof thin;
    left?: typeof thin;
    right?: typeof thin;
  };

  const moneyFmt =
    '_(* #,##0_);_(* \\(#,##0\\);_(* "-"??_);_(@_)';

  const pctFmt =
    '_(* #,##0.00%_);_(* \\(#,##0.00%\\);_(* "-"??_);_(@_)';

  const leftBorderColumns = new Set([1, 2, 3, 5, 7, 9, 10, 13, 15]);
  const rightBorderColumns = new Set([3, 5, 7, 10, 11, 13, 15, 16]);

  const setExactVerticalBorder = (
    cell: XLSX.CellObject,
    column: number,
  ) => {
    const border: BorderPatch = {};
    if (leftBorderColumns.has(column)) border.left = thin;
    if (rightBorderColumns.has(column)) border.right = thin;

    cell.s = {
      ...(cell.s ?? {}),
      border: {
        ...(cell.s?.border ?? {}),
        ...border,
      },
    };
  };

  const setHorizontalBorder = (
    row: number,
    top: boolean,
    bottom: boolean,
  ) => {
    for (let c = 1; c <= 16; c += 1) {
      const address = XLSX.utils.encode_cell({
        r: row - 1,
        c: c - 1,
      });
      const cell =
        worksheet[address] ??
        ({ v: "", t: "s" } as XLSX.CellObject);
      worksheet[address] = cell;

      const border: BorderPatch = {};
      if (top) border.top = thin;
      if (bottom) border.bottom = thin;

      cell.s = {
        ...(cell.s ?? {}),
        border: {
          ...(cell.s?.border ?? {}),
          ...border,
        },
      };
    }
  };

  const moneyColumns = new Set([2, 4, 6, 8, 11, 13, 15]);
  const percentageColumns = new Set([3, 5, 7, 9, 12, 14, 16]);

  for (let r = 1; r <= rows.length; r += 1) {
    for (let c = 1; c <= 16; c += 1) {
      const address = XLSX.utils.encode_cell({
        r: r - 1,
        c: c - 1,
      });
      const cell =
        worksheet[address] ??
        ({ v: "", t: "s" } as XLSX.CellObject);
      worksheet[address] = cell;

      cell.s = {
        ...(cell.s ?? {}),
        font: {
          name: "Calibri",
          sz: 11,
          bold: boldRows.has(r),
        },
        alignment: {
          vertical: "center",
          horizontal: c === 1 ? "left" : c === 10 ? "center" : "right",
        },
      };

      setExactVerticalBorder(cell, c);

      if (percentageColumns.has(c)) cell.z = pctFmt;
      else if (moneyColumns.has(c)) cell.z = moneyFmt;
    }
  }

  const headerFill = {
    fgColor: { rgb: "ABF59F" },
  };

  const headerFont = {
    name: "Calibri",
    sz: 11,
    bold: true,
    color: "000000",
  };

  const headerFillCells = new Set([
    "A1",
    "B1",
    "F1",
    "H1",
    "K1",
    "O1",
  ]);

  for (let r = 1; r <= 2; r += 1) {
    for (let c = 1; c <= 16; c += 1) {
      const address = XLSX.utils.encode_cell({
        r: r - 1,
        c: c - 1,
      });
      const cell = worksheet[address] as XLSX.CellObject;
      const border: BorderPatch = {};

      if (r === 1) {
        border.top = thin;
        if (c !== 10) border.bottom = thin;
      } else if (c === 1) {
        border.bottom = thin;
      } else if (c !== 10) {
        border.top = thin;
        border.bottom = thin;
      }

      cell.s = {
        ...(cell.s ?? {}),
        font: headerFont,
        alignment: {
          horizontal: "center",
          vertical: "center",
          wrapText: true,
        },
        border: {
          ...(cell.s?.border ?? {}),
          ...border,
        },
      };

      if (
        headerFillCells.has(address) ||
        (r === 2 && c >= 2 && c <= 16 && c !== 10)
      ) {
        cell.s.fill = headerFill;
      }
    }
  }

  if (worksheet.A1) {
    worksheet.A1.s = {
      ...(worksheet.A1.s ?? {}),
      alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: true,
      },
    };
  }

  /* J separator: always blank, no fill, left + right border. */
  for (let r = 1; r <= rows.length; r += 1) {
    const address = XLSX.utils.encode_cell({
      r: r - 1,
      c: 9,
    });
    const cell = worksheet[address];
    if (!cell) continue;

    cell.s = {
      ...(cell.s ?? {}),
      fill: undefined,
      alignment: {
        ...(cell.s?.alignment ?? {}),
        horizontal: "center",
        vertical: "center",
      },
      border: {
        ...(cell.s?.border ?? {}),
        left: thin,
        right: thin,
      },
    };
  }

  /* Exact horizontal rules from the reference: */
  setHorizontalBorder(4, false, true);  // STATISTIC bottom
  setHorizontalBorder(5, true, false);   // first statistic top
  setHorizontalBorder(10, false, true);  // last statistic bottom

  for (const r of [4]) {
    for (let c = 1; c <= 16; c += 1) {
      const address = XLSX.utils.encode_cell({
        r: r - 1,
        c: c - 1,
      });
      const cell = worksheet[address];
      if (!cell) continue;
      cell.s = {
        ...(cell.s ?? {}),
        font: { name: "Calibri", sz: 11, bold: true },
      };
    }
  }

  for (const r of sectionRows) {
    for (let c = 1; c <= 16; c += 1) {
      const address = XLSX.utils.encode_cell({
        r: r - 1,
        c: c - 1,
      });
      const cell = worksheet[address];
      if (!cell) continue;
      cell.s = {
        ...(cell.s ?? {}),
        font: { name: "Calibri", sz: 11, bold: true },
      };
    }
  }

  for (const r of totalRows) {
    setHorizontalBorder(r, true, true);
    for (let c = 1; c <= 16; c += 1) {
      const address = XLSX.utils.encode_cell({
        r: r - 1,
        c: c - 1,
      });
      const cell = worksheet[address];
      if (!cell) continue;
      cell.s = {
        ...(cell.s ?? {}),
        font: { name: "Calibri", sz: 11, bold: true },
      };
    }
  }

  /* Re-apply exact vertical map after every horizontal-border pass. */
  for (let r = 1; r <= rows.length; r += 1) {
    for (let c = 1; c <= 16; c += 1) {
      const address = XLSX.utils.encode_cell({
        r: r - 1,
        c: c - 1,
      });
      const cell = worksheet[address];
      if (cell) setExactVerticalBorder(cell, c);
    }
  }

  /* J remains a complete separator, including on total rows. */
  for (let r = 1; r <= rows.length; r += 1) {
    const address = XLSX.utils.encode_cell({
      r: r - 1,
      c: 9,
    });
    const cell = worksheet[address];
    if (!cell) continue;
    cell.s = {
      ...(cell.s ?? {}),
      border: {
        ...(cell.s?.border ?? {}),
        left: thin,
        right: thin,
      },
    };
  }

  addFreezePane(worksheet, 2, 1);

  return worksheet;
}

/**
 * Membuat sheet expense division mengikuti struktur workbook MIS.
 *
 * Sumber seluruh akun berasal dari macroRows yang sedang diexport.
 * Tidak ada nomor row MACRO yang di-hardcode.
 */
function buildExpenseDivisionSheet(
  sheetName: string,
  macroRows: MisMacroExportRow[],
  divisionCodes: string[],
  options?: {
    energyDivision?: boolean;
  },
): XLSX.WorkSheet {
  const incomeStatementRevenueTotalRow = 9;

  const sourceRows = macroRows.filter(
    (row) =>
      row.category_code === "EXPENSE" &&
      divisionCodes.includes(row.division_code),
  );

  const isEnergy = (row: MisMacroExportRow) => {
    const name = row.account_name.trim().toUpperCase();
    return (
      name.includes("ELECTRICITY") ||
      name.includes("WATER") ||
      name.includes("FUEL")
    );
  };

  const sections: Array<{
    title: string;
    rows: MisMacroExportRow[];
  }> = [];

  if (options?.energyDivision) {
    const normalRows = sourceRows.filter((row) => !isEnergy(row));
    const energyRows = sourceRows.filter(isEnergy);

    if (normalRows.length > 0) {
      sections.push({ title: sheetName, rows: normalRows });
    }
    if (energyRows.length > 0) {
      sections.push({ title: "ENERGY", rows: energyRows });
    }
  } else {
    sections.push({ title: sheetName, rows: sourceRows });
  }

  const rows: unknown[][] = [
    [
      "DESCRIPTION",
      "CURRENT MONTH", null, null, null,
      "LAST MONTH", null,
      "LAST YEAR", null,
      null,
      "YEAR TO DATE", null, null, null,
      "LAST YEAR YTD", null,
    ],
    [
      null,
      "ACTUAL", "%", "BUDGET", "%",
      "ACTUAL", "%",
      "LAST YEAR", "%",
      null,
      "ACTUAL", "%", "BUDGET", "%",
      "ACTUAL", "%",
    ],
  ];

  const sectionRows: number[] = [];
  const totalRows: number[] = [];

  const pct = (
    valueColumn: string,
    row: number,
    revenueColumn: string,
  ) =>
    formulaCell(
      `IF('Income Statement'!${revenueColumn}${incomeStatementRevenueTotalRow}=0,0,${valueColumn}${row}/'Income Statement'!${revenueColumn}${incomeStatementRevenueTotalRow})`,
    );

  const addSection = (
    title: string,
    source: MisMacroExportRow[],
  ) => {
    const sectionRow = rows.length + 1;
    sectionRows.push(sectionRow);

    rows.push([
      title, "", "", "", "", "", "", "", "", null, "", "", "", "", "", "",
    ]);

    const dataStartRow = rows.length + 1;

    for (const item of source) {
      const macroExcelRow = macroRows.indexOf(item) + 6;
      const excelRow = rows.length + 1;

      rows.push([
        item.account_name,
        formulaCell(`MACRO!E${macroExcelRow}`),
        pct("B", excelRow, "G"),
        formulaCell(`MACRO!F${macroExcelRow}`),
        pct("D", excelRow, "E"),
        formulaCell(`MACRO!D${macroExcelRow}`),
        pct("F", excelRow, "A"),
        formulaCell(`MACRO!G${macroExcelRow}`),
        pct("H", excelRow, "C"),
        null,
        formulaCell(`MACRO!H${macroExcelRow}`),
        pct("K", excelRow, "N"),
        formulaCell(`MACRO!I${macroExcelRow}`),
        pct("M", excelRow, "L"),
        formulaCell(`MACRO!J${macroExcelRow}`),
        pct("O", excelRow, "J"),
      ]);
    }

    const dataEndRow = rows.length;
    const totalRow = rows.length + 1;
    totalRows.push(totalRow);

    const sumOrZero = (column: string) =>
      source.length > 0
        ? formulaCell(`SUM(${column}${dataStartRow}:${column}${dataEndRow})`)
        : formulaCell("0");

    rows.push([
      "TOTAL EXPENSES",
      sumOrZero("B"),
      pct("B", totalRow, "G"),
      sumOrZero("D"),
      pct("D", totalRow, "E"),
      sumOrZero("F"),
      pct("F", totalRow, "A"),
      sumOrZero("H"),
      pct("H", totalRow, "C"),
      null,
      sumOrZero("K"),
      pct("K", totalRow, "N"),
      sumOrZero("M"),
      pct("M", totalRow, "L"),
      sumOrZero("O"),
      pct("O", totalRow, "J"),
    ]);
  };

  for (const section of sections) {
    if (section.rows.length > 0) {
      addSection(section.title, section.rows);
    }
  }

  const widthMap: Record<string, number[]> = {
    "PAYROLL RELATED EXPENSES": [30.21875, 18.44140625, 11.44140625, 18.44140625, 11.44140625, 18.44140625, 11.44140625, 18.44140625, 11.44140625, 2.21875, 18.44140625, 11.44140625, 18.44140625, 11.44140625, 18.44140625, 11.44140625],
    "A&G EXPENSES": [50.559082, 15.281982, 10.568848, 16.424561, 10.568848, 15.281982, 10.568848, 16.424561, 10.568848, 2.21875, 16.424561, 10.568848, 16.424561, 10.568848, 16.424561, 10.568848],
    "SALES DESIGN EXPENSES": [50.559082, 15.281982, 10.568848, 16.424561, 10.568848, 15.281982, 10.568848, 16.424561, 10.568848, 2.21875, 16.424561, 10.568848, 16.424561, 10.568848, 16.424561, 10.568848],
    "SERVICE EXPENSES": [51.844482, 15.281982, 10.568848, 15.281982, 10.568848, 15.281982, 10.568848, 15.281982, 10.568848, 2.21875, 16.424561, 10.568848, 16.424561, 10.568848, 16.424561, 10.568848],
    "HRD EXPENSES": [58.842773, 12.854004, 10.568848, 15.281982, 10.568848, 15.281982, 10.568848, 12.854004, 10.568848, 2.21875, 15.281982, 10.568848, 15.281982, 10.568848, 16.424561, 10.568848],
    "POMEC EXPENSES": [44.703369, 16.424561, 10.568848, 16.424561, 10.568848, 16.424561, 10.568848, 16.424561, 10.568848, 2.21875, 17.567139, 10.568848, 17.567139, 10.568848, 17.567139, 10.568848],
  };

  const worksheet = createSheet(
    rows,
    widthMap[sheetName] ?? widthMap["A&G EXPENSES"],
  );

  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
    { s: { r: 0, c: 1 }, e: { r: 0, c: 4 } },
    { s: { r: 0, c: 5 }, e: { r: 0, c: 6 } },
    { s: { r: 0, c: 7 }, e: { r: 0, c: 8 } },
    { s: { r: 0, c: 10 }, e: { r: 0, c: 13 } },
    { s: { r: 0, c: 14 }, e: { r: 0, c: 15 } },
  ];

  const thin = { style: "thin" as const, color: "000000" };
  const moneyFmt = '_(* #,##0_);_(* \\(#,##0\\);_(* "-"??_);_(@_)';
  const pctFmt = '_(* #,##0.00%_);_(* \\(#,##0.00%\\);_(* "-"??_);_(@_)';

  for (let r = 1; r <= rows.length; r += 1) {
    for (let c = 1; c <= 16; c += 1) {
      const address = XLSX.utils.encode_cell({ r: r - 1, c: c - 1 });
      const cell =
        worksheet[address] ?? ({ v: "", t: "s" } as XLSX.CellObject);
      worksheet[address] = cell;

      const moneyColumns = new Set([2, 4, 6, 8, 11, 13, 15]);
      const pctColumns = new Set([3, 5, 7, 9, 12, 14, 16]);

      cell.s = {
        ...(cell.s ?? {}),
        font: {
          name: "Calibri",
          sz: 11,
          bold: r <= 3 || sectionRows.includes(r) || totalRows.includes(r),
          color: "000000",
        },
        alignment: {
          vertical: "center",
          horizontal: c === 1 ? "left" : "right",
        },
        border: {
          ...(cell.s?.border ?? {}),
          left: thin,
          right: thin,
        },
      };

      if (moneyColumns.has(c)) cell.z = moneyFmt;
      if (pctColumns.has(c)) cell.z = pctFmt;
    }
  }

  const green = "ABF59F";
  const headerFont = {
    name: "Calibri",
    sz: 11,
    bold: true,
    color: "000000",
  };

  // Header: all actual header groups are the same green.
  for (let r = 1; r <= 2; r += 1) {
    for (let c = 1; c <= 16; c += 1) {
      const address = XLSX.utils.encode_cell({ r: r - 1, c: c - 1 });
      const cell = worksheet[address]!;
      if (c === 10) {
        // J = separator, deliberately no fill.
        cell.s = {
          ...(cell.s ?? {}),
          fill: undefined,
          border: { top: thin, bottom: thin, left: thin, right: thin },
        };
        continue;
      }

      cell.s = {
        ...(cell.s ?? {}),
        font: headerFont,
        fill: { fgColor: { rgb: green } },
        alignment: {
          horizontal: "center",
          vertical: "center",
          wrapText: true,
        },
        border: { top: thin, bottom: thin, left: thin, right: thin },
      };
    }
  }

  // Section rows and totals.
  for (const row of sectionRows) {
    for (let c = 1; c <= 16; c += 1) {
      const cell = worksheet[
        XLSX.utils.encode_cell({ r: row - 1, c: c - 1 })
      ];
      if (!cell) continue;
      cell.s = {
        ...(cell.s ?? {}),
        font: { name: "Calibri", sz: 11, bold: true, color: "000000" },
      };
    }
  }

  for (const row of totalRows) {
    for (let c = 1; c <= 16; c += 1) {
      const cell = worksheet[
        XLSX.utils.encode_cell({ r: row - 1, c: c - 1 })
      ];
      if (!cell) continue;
      cell.s = {
        ...(cell.s ?? {}),
        font: { name: "Calibri", sz: 11, bold: true, color: "000000" },
        border: {
          ...(cell.s?.border ?? {}),
          top: thin,
          bottom: thin,
        },
      };
    }
  }

  // Re-apply vertical borders, with J as a complete separator.
  for (let r = 1; r <= rows.length; r += 1) {
    for (let c = 1; c <= 16; c += 1) {
      const cell = worksheet[
        XLSX.utils.encode_cell({ r: r - 1, c: c - 1 })
      ];
      if (!cell) continue;

      cell.s = {
        ...(cell.s ?? {}),
        border: {
          ...(cell.s?.border ?? {}),
          left: thin,
          right: thin,
        },
      };
    }
  }

  addFreezePane(worksheet, 2, 1);
  return worksheet;
}

/**
 * Membuat placeholder sheet untuk sheet MIS yang membutuhkan
 * engine khusus dan akan diisi pada tahap berikutnya.
 */


/**
 * Generate workbook MIS.
 *
 * Tahap ini sudah menyiapkan seluruh struktur workbook
 * sesuai workbook MIS yang menjadi referensi.
 *
 * Sheet yang menggunakan engine aktif:
 * - MACRO
 * - COA
 * - Period
 * - Year Summary
 * - Income Statement
 *
 * Sheet Balance Sheet dan division detail disiapkan
 * sebagai placeholder sampai engine masing-masing
 * dihubungkan.
 */
export function generateMisWorkbook({
  entityId,
  year,
  month,
  macroRows,
  bsDetailRows,
  balanceSheetRows,
  coaRows,
}: MisWorkbookParams): XLSX.WorkBook {

  if (!entityId) {
    throw new Error(
      "Entity ID wajib diisi.",
    );
  }

  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100
  ) {
    throw new Error(
      "Tahun MIS tidak valid.",
    );
  }

  if (
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    throw new Error(
      "Bulan MIS tidak valid.",
    );
  }

  const workbook = XLSX.utils.book_new();

  const macroSheet = buildMacroSheet(
    macroRows,
    year,
    month,
  );

  XLSX.utils.book_append_sheet(
    workbook,
    macroSheet,
    "MACRO",
  );

  const coaSheet = buildCoaSheet(
    coaRows ?? [],
    year,
  );

  XLSX.utils.book_append_sheet(
    workbook,
    coaSheet,
    "COA",
  );

  const periodSheet = buildPeriodSheet(
    year,
    month,
  );

  XLSX.utils.book_append_sheet(
    workbook,
    periodSheet,
    "Period",
  );

  const bsDetailSheet = buildBsDetailSheet(
    bsDetailRows,
    year,
    month,
  );

  XLSX.utils.book_append_sheet(
    workbook,
    bsDetailSheet,
    "BS Detail",
  );

  const balanceSheetSheet = buildBalanceSheetSheet(
    balanceSheetRows,
    year,
    month,
  );

  XLSX.utils.book_append_sheet(
    workbook,
    balanceSheetSheet,
    "Balance Sheet",
  );

  const yearSummarySheet =
    buildYearSummarySheet(
      macroRows,
      year,
    );

  XLSX.utils.book_append_sheet(
    workbook,
    yearSummarySheet,
    "Year Summary",
  );

  const incomeStatementSheet =
    buildIncomeStatementSheet(
      macroRows,
      year,
      month,
    );

  XLSX.utils.book_append_sheet(
    workbook,
    incomeStatementSheet,
    "Income Statement",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    buildFbPnlSheet(macroRows),
    "F&B - P&L",
  );

  const expenseSheetConfigs: Array<{
    name: string;
    divisions: string[];
    energyDivision?: boolean;
  }> = [
    { name: "PAYROLL RELATED EXPENSES", divisions: ["CORP"] },
    { name: "A&G EXPENSES", divisions: ["A&G"] },
    { name: "SALES DESIGN EXPENSES", divisions: ["S&M"] },
    { name: "SERVICE EXPENSES", divisions: ["SRVC"] },
    { name: "HRD EXPENSES", divisions: ["HR"] },
    { name: "POMEC EXPENSES", divisions: ["ENG"], energyDivision: true },
  ];

  for (const config of expenseSheetConfigs) {
    XLSX.utils.book_append_sheet(
      workbook,
      buildExpenseDivisionSheet(
        config.name,
        macroRows,
        config.divisions,
        { energyDivision: config.energyDivision },
      ),
      config.name,
    );
  }

  return workbook;
}

/**
 * Generate dan langsung download file Excel.
 */
export function downloadMisWorkbook({
  entityId,
  year,
  month,
  macroRows,
  bsDetailRows,
  balanceSheetRows,
  coaRows = [],
  fileName,
}: MisWorkbookParams & {
  fileName?: string;
}): void {
  const workbook = generateMisWorkbook({
    entityId,
    year,
    month,
    macroRows,
    bsDetailRows,
    balanceSheetRows,
    coaRows,
  });

  const monthName =
    MONTHS[month - 1] ?? String(month);

  const safeMonthName =
    monthName.replace(
      /[^a-zA-Z0-9]/g,
      "",
    );

  const outputFileName =
    fileName ??
    `MIS_Report_${safeMonthName}_${year}.xlsx`;

  const workbookBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const blob = new Blob(
    [workbookBuffer],
    {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = outputFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}