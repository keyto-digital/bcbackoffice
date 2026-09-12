import type { InventoryRequest, InventoryRequestLineForm } from "../types";

function fmtDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID");
}

function fmtQty(value: number) {
  return Number(value || 0).toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

/*
 * =====================================================
 * PRINT PAGINATION
 * =====================================================
 *
 * A4 Portrait dengan margin 12mm.
 *
 * 1 lembar A4 dibagi menjadi 2 area:
 *
 * ┌─────────────────────────┐
 * │       ½ A4 ATAS         │
 * │                         │
 * ├─────────────────────────┤
 * │       ½ A4 BAWAH        │
 * └─────────────────────────┘
 *
 * Halaman pertama memiliki header Store Request,
 * sehingga kapasitas item dibuat sedikit lebih kecil.
 *
 * Halaman lanjutan tidak memiliki header informasi,
 * sehingga tabel dapat dibuat jauh lebih panjang.
 */
function chunkDetails(
  details: InventoryRequestLineForm[],
) {
  const firstPageSize = 12;
  const continuationPageSize = 18;

  const chunks: InventoryRequestLineForm[][] = [];

  /*
   * =====================================================
   * ½ A4 PERTAMA
   * =====================================================
   *
   * Header + informasi request + tabel.
   */
  if (details.length > 0) {
    chunks.push(
      details.slice(0, firstPageSize),
    );
  }

  /*
   * =====================================================
   * ½ A4 LANJUTAN
   * =====================================================
   *
   * Karena hanya berisi tabel, kapasitas dibuat lebih besar.
   */
  for (
    let i = firstPageSize;
    i < details.length;
    i += continuationPageSize
  ) {
    chunks.push(
      details.slice(
        i,
        i + continuationPageSize,
      ),
    );
  }

  return chunks;
}

export function printInventoryRequest(
  header: InventoryRequest,
  details: InventoryRequestLineForm[],
) {
  const detailChunks = chunkDetails(details);

  const html = `

<html>

<head>

<title>${header.request_no}</title>

<style>

@page{
  size:A4 portrait;
  margin:12mm;
}

html,
body{
  margin:0;
  padding:0;
}

body{
  font-family:Arial,Helvetica,sans-serif;
  font-size:10px;
  color:#000;
}

.print-half{
  height:136.5mm;
  max-height:136.5mm;
  box-sizing:border-box;
  overflow:hidden;
  position:relative;
}

.print-half:nth-child(2n){
  break-after:page;
  page-break-after:always;
}

.print-half:last-child{
  break-after:auto;
  page-break-after:auto;
}

table{
  width:100%;
  border-collapse:collapse;
}

th,
td{
  border:1px solid #000;
  padding:2.5px 4px;
  font-size:9px;
  line-height:1.2;
}

th{
  background:#eee;
  font-size:9px;
  font-weight:bold;
  padding:3px 4px;
}

.print-table{
  width:100%;
  table-layout:fixed;
}

.print-table th,
.print-table td{
  vertical-align:middle;
}

.print-table th:nth-child(1),
.print-table td:nth-child(1){
  width:5%;
}

.print-table th:nth-child(2),
.print-table td:nth-child(2){
  width:auto;
}

.print-table th:nth-child(3),
.print-table td:nth-child(3),
.print-table th:nth-child(4),
.print-table td:nth-child(4),
.print-table th:nth-child(5),
.print-table td:nth-child(5){
  width:12%;
}

.print-table th:nth-child(6),
.print-table td:nth-child(6){
  width:20%;
}

.header{
  margin-bottom:10px;
}

.title{
  font-size:18px;
  font-weight:bold;
  text-align:center;
  margin-bottom:6px;
}

.info td{
  border:none;
  padding:2px 3px;
  vertical-align:top;
  text-align:left;
  font-size:9px;
  line-height:1.2;
}

.info td:nth-child(3){
  text-align:right;
  padding-right:5px;
  font-weight:bold;
  white-space:nowrap;
}

.info td:nth-child(4){
white-space:nowrap;
}

.sign{
  margin-top:18px;
  width:100%;
}

.sign td{
  border:none;
  text-align:center;
  padding-top:32px;
  font-size:9px;
}

.continuation-title{
  font-size:11px;
  font-weight:bold;
  margin-bottom:5px;
}

.continuation-table{
  margin-top:0;
}

.right{
text-align:right;
}

.center{
text-align:center;
}

</style>

</head>

<body>

${detailChunks
  .map(
    (chunk, chunkIndex) => `
<div class="print-half">

  ${
    chunkIndex === 0
      ? `
        <div class="title">
          STORE REQUEST
        </div>

        <div
          class="header"
          style="overflow:hidden; margin-bottom:10px;"
        >

          <div style="float:left; width:58%;">

            <table class="info">

              <tr>
                <td width="38%">Nomor</td>
                <td>: ${header.request_no}</td>
              </tr>

              <tr>
                <td>Gudang Asal</td>
                <td>: ${header.source_store_name}</td>
              </tr>

              <tr>
                <td>Gudang Tujuan</td>
                <td>: ${header.destination_store_name}</td>
              </tr>

              <tr>
                <td>Catatan</td>
                <td>: ${header.remarks ?? "-"}</td>
              </tr>

            </table>

          </div>

          <div style="float:right; width:32%;">

            <table class="info">

              <tr>
                <td width="40%">Tanggal</td>
                <td>: ${fmtDate(header.request_date)}</td>
              </tr>

              <tr>
                <td>Status</td>
                <td>: ${header.status}</td>
              </tr>

            </table>

          </div>

        </div>
      `
      : `
        <div class="continuation-title">
          STORE REQUEST — Lanjutan : ${header.request_no}
        </div>
      `
  }

  <table class="print-table continuation-table">

    <thead>
      <tr>
        <th width="5%">No</th>
        <th>Item</th>
        <th width="12%">Qty Request</th>
        <th width="12%">Qty Approve</th>
        <th width="12%">Qty Transfer</th>
        <th width="20%">Catatan</th>
      </tr>
    </thead>

    <tbody>

      ${chunk
        .map(
          (x, index) => {
            const globalIndex =
              chunkIndex === 0
                ? index
                : 12 +
                  (chunkIndex - 1) * 18 +
                  index;

            return `
              <tr>

                <td class="center">
                  ${globalIndex + 1}
                </td>

                <td>
                  ${x.item_code ?? ""} - ${x.item_name ?? ""}
                </td>

                <td class="right">
                  ${fmtQty(x.qty_request)}
                </td>

                <td class="right">
                  ${fmtQty(x.qty_approved)}
                </td>

                <td class="right">
                  ${fmtQty(x.qty_transfer)}
                </td>

                <td>
                  ${x.remarks ?? ""}
                </td>

              </tr>
            `;
          },
        )
        .join("")}

    </tbody>

  </table>

  ${
    chunkIndex === detailChunks.length - 1
      ? `
        <table class="sign">

          <tr>

            <td>
              Dibuat oleh,
            </td>

            <td>
              Disiapkan oleh,
            </td>

            <td>
              Diterima oleh,
            </td>

          </tr>

          <tr>

            <td>
              ____________________
            </td>

            <td>
              ____________________
            </td>

            <td>
              ____________________
            </td>

          </tr>

        </table>
      `
      : ""
  }

</div>
`,
  )
  .join("")}

<script>

window.onload=function(){

  window.print();

  window.close();

}

</script>

</body>

</html>

`;

  const win = window.open("", "_blank", "width=900,height=900");

  if (!win) return;

  win.document.open();

  win.document.write(html);

  win.document.close();
}
