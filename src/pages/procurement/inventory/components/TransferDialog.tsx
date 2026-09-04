import type {
  InventoryRequest,
  InventoryRequestLineForm,
  ItemOption,
} from "../types";

interface Props {
  open: boolean;
  request: InventoryRequest | null;
  details: InventoryRequestLineForm[];
  items: ItemOption[];
  onQtyChange: (index: number, qty: number) => void;
  onClose: () => void;
  onTransfer: () => void;
  saving?: boolean;
}

export default function TransferDialog({
  open,
  request,
  details,
  items,
  onQtyChange,
  onClose,
  onTransfer,
  saving = false,
}: Props) {
  if (!open || !request) {
    return null;
  }

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        overflow-y-auto
        bg-black/40
        p-4
      "
    >
      <div
        className="
          flex
          min-h-full
          items-start
          justify-center
          pt-6
          pb-6
          md:pt-10
          md:pb-10
        "
      >
        <div
          className="
            flex
            w-full
            max-w-[900px]
            max-h-[90vh]
            flex-col
            overflow-hidden
            rounded-lg
            bg-white
            shadow-lg
          "
        >
          {/* =========================
              HEADER
          ========================== */}

          <div
            className="
              shrink-0
              border-b
              px-6
              py-4
            "
          >
            <h2 className="text-lg font-semibold">
              Transfer Inventory
            </h2>
          </div>

          {/* =========================
              BODY - SCROLL AREA
          ========================== */}

          <div
            className="
              flex-1
              overflow-y-auto
              p-6
            "
          >
            <div className="space-y-4">
              {/* INFO */}

              <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <div>
                  <b>No :</b>{" "}
                  {request.request_no}
                </div>

                <div>
                  <b>Tanggal :</b>{" "}
                  {request.request_date}
                </div>

                <div>
                  <b>Asal :</b>{" "}
                  {request.source_store_name}
                </div>

                <div>
                  <b>Tujuan :</b>{" "}
                  {request.destination_store_name}
                </div>
              </div>

              {/* TABLE */}

              <div className="overflow-x-auto rounded border">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-left">
                        Item
                      </th>

                      <th className="p-2 text-right">
                        Approved
                      </th>

                      <th className="p-2 text-center">
                        Transfer
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {details.map(
                      (row, index) => {
                        const item =
                          items.find(
                            (x) =>
                              x.id ===
                              row.item_id,
                          );

                        return (
                          <tr
                            key={
                              row.id ??
                              `${row.item_id}-${index}`
                            }
                            className="border-t"
                          >
                            <td className="p-2">
                              {item
                                ? `${item.code} - ${item.name}`
                                : "-"}
                            </td>

                            <td className="p-2 text-right">
                              {row.qty_approved}
                            </td>

                            <td className="p-2 text-center">
                              <input
                                type="number"
                                step="0.0001"
                                min="0"
                                value={
                                  row.qty_transfer
                                }
                                onChange={(e) =>
                                  onQtyChange(
                                    index,
                                    Number(
                                      e.target.value,
                                    ),
                                  )
                                }
                                className="
                                  w-28
                                  rounded
                                  border
                                  px-2
                                  py-1
                                  text-right
                                "
                              />
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* =========================
              FOOTER
              SELALU TERLIHAT
          ========================== */}

          <div
            className="
              shrink-0
              flex
              justify-end
              gap-2
              border-t
              bg-white
              p-4
            "
          >
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="
                rounded
                border
                px-4
                py-2
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              Batal
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => {
                for (
                  const row of details
                ) {
                  if (
                    Number(
                      row.qty_transfer,
                    ) <= 0
                  ) {
                    alert(
                      "Qty Transfer harus lebih dari 0.",
                    );

                    return;
                  }

                  if (
                    Number(
                      row.qty_transfer,
                    ) >
                    Number(
                      row.qty_approved,
                    )
                  ) {
                    alert(
                      "Qty Transfer tidak boleh melebihi Qty Approved.",
                    );

                    return;
                  }
                }

                onTransfer();
              }}
              className="
                rounded
                bg-green-600
                px-4
                py-2
                text-white
                hover:bg-green-700
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {saving
                ? "Memproses..."
                : "Transfer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}