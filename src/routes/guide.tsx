import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/guide")({
  component: Guide,
});

type RoomState =
  | "Vacant - Clean & Ready"
  | "Vacant - Needs Cleaning/Repair"
  | "Advertised / Showing"
  | "Prospective Applicant"
  | "Occupied - New Tenant (move-in)"
  | "Occupied - Mid-tenancy"
  | "Occupied - Breach / Issue"
  | "Tenant Ending / Notice Given"
  | "Vacant - End-of-Tenancy Inspection / Bond Claim"
  | "Under Repair / Renovation";

const ALL_STATES: RoomState[] = [
  "Vacant - Clean & Ready",
  "Vacant - Needs Cleaning/Repair",
  "Advertised / Showing",
  "Prospective Applicant",
  "Occupied - New Tenant (move-in)",
  "Occupied - Mid-tenancy",
  "Occupied - Breach / Issue",
  "Tenant Ending / Notice Given",
  "Vacant - End-of-Tenancy Inspection / Bond Claim",
  "Under Repair / Renovation",
];

const defaultHouseRules = `• Rent due: specify day (e.g. weekly on Mondays)\n• Bond: up to 4 weeks’ rent; lodged with Bond Administrator\n• Cleaning: tenants responsible for their room. Shared areas on a roster.\n• Quiet hours: 10pm–7am.\n• No smoking inside.\n• Pets: require landlord approval.\n• Reporting repairs: SMS/email with photos when possible.`;

function Guide() {
  const [rooms, setRooms] = useState(
    Array.from({ length: 4 }, (_, i) => ({
      id: i + 1,
      name: `Room ${i + 1}`,
      state: (i === 0 ? "Occupied - Mid-tenancy" : "Vacant - Clean & Ready") as RoomState,
      tenant: i === 0 ? "You (resident manager)" : "",
      bondRef: "",
    }))
  );

  const [houseRules, setHouseRules] = useState(defaultHouseRules);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [showMoveInModal, setShowMoveInModal] = useState(false);
  const [showMoveOutModal, setShowMoveOutModal] = useState(false);

  function updateRoom(id: number, patch: Partial<(typeof rooms)[0]>) {
    setRooms((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  function transitionRoom(id: number, next: RoomState) {
    updateRoom(id, { state: next });
  }

  function openMoveIn(id: number) {
    setSelectedRoomId(id);
    setShowMoveInModal(true);
  }

  function openMoveOut(id: number) {
    setSelectedRoomId(id);
    setShowMoveOutModal(true);
  }

  function printChecklist() {
    window.print();
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Tenancy FSM & Management</h1>
          <p className="text-sm text-gray-600">
            Simple printable management UI for a 4-bedroom rental — tailored for WA rules.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={printChecklist}
            className="px-3 py-2 bg-slate-800 text-white rounded-lg text-sm shadow">
            Print / Save PDF
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {rooms.map((room) => (
          <div key={room.id} className="border rounded-lg p-4 shadow-sm bg-white">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold">{room.name}</h2>
                <p className="text-xs text-gray-500">Tenant: {room.tenant || "—"}</p>
              </div>
              <div className="text-right text-xs text-gray-500">
                <div className="mb-1">State</div>
                <div className="inline-block px-2 py-1 bg-slate-100 rounded">{room.state}</div>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-600">Change state</label>
              <select
                className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                value={room.state}
                onChange={(e) => transitionRoom(room.id, e.target.value as RoomState)}>
                {ALL_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => openMoveIn(room.id)}
                  className="px-3 py-2 text-sm bg-green-600 text-white rounded">
                  Move-In Pack
                </button>
                <button
                  onClick={() => openMoveOut(room.id)}
                  className="px-3 py-2 text-sm bg-amber-600 text-white rounded">
                  Move-Out Pack
                </button>
                <button
                  onClick={() =>
                    updateRoom(room.id, { tenant: prompt("Tenant name:") || room.tenant })
                  }
                  className="px-3 py-2 text-sm bg-slate-200 rounded">
                  Edit Tenant
                </button>
              </div>

              <div className="mt-3 text-xs text-gray-600">
                <div>
                  Bond ref: <span className="font-medium">{room.bondRef || "—"}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Global required documents & actions</h3>
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
          <li>
            Use <strong>Form 1AA</strong> (Residential Tenancy Agreement) — one per tenant for
            room-by-room.
          </li>
          <li>
            Provide <strong>Form 1AC / 1AD</strong> at tenancy start.
          </li>
          <li>
            Complete and give two copies of <strong>Property Condition Report (Form 1)</strong>{" "}
            within 7 days.
          </li>
          <li>Lodge bond with Bond Administrator (BondsOnline) and provide receipt.</li>
          <li>Take date-stamped photos/video; keep signed copies if possible.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold mb-2">House Rules (editable)</h3>
        <textarea
          className="w-full rounded border p-3 text-sm h-40"
          value={houseRules}
          onChange={(e) => setHouseRules(e.target.value)}
        />
      </section>

      <section className="mb-12">
        <h3 className="text-lg font-semibold mb-2">One-page Checklists</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded p-4 bg-white">
            <h4 className="font-semibold mb-2">Move-In checklist</h4>
            <ol className="text-sm space-y-1">
              <li>Signed Form 1AA (tenancy agreement)</li>
              <li>Tenant received Form 1AC/1AD</li>
              <li>Property Condition Report (2 copies) given</li>
              <li>Bond paid and lodged (Bond Admin ref)</li>
              <li>First rent paid (receipt)</li>
              <li>Keys handed over (tenant signed)</li>
              <li>Move-in photos/video saved (filenames/dates)</li>
            </ol>
          </div>

          <div className="border rounded p-4 bg-white">
            <h4 className="font-semibold mb-2">Move-Out checklist</h4>
            <ol className="text-sm space-y-1">
              <li>Final clean completed</li>
              <li>Personal items removed</li>
              <li>Keys returned & signed</li>
              <li>Final Property Condition Report completed & signed</li>
              <li>Photos/video taken</li>
              <li>Bond returned / claim submitted with invoices</li>
            </ol>
          </div>
        </div>
      </section>

      <footer className="text-sm text-gray-500 mb-6">
        Guidance: Residential Tenancies Act (WA). For legal uncertainty contact DMIRS.
      </footer>

      {/* Move-In Modal (simple printable pack) */}
      {showMoveInModal && selectedRoomId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 shadow-lg print:bg-white">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-bold">Move-In Pack — Room {selectedRoomId}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowMoveInModal(false)}
                  className="px-3 py-1 text-sm rounded bg-slate-200">
                  Close
                </button>
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="px-3 py-1 text-sm rounded bg-slate-800 text-white">
                  Print
                </button>
              </div>
            </div>

            <div className="mt-4 text-sm space-y-2">
              <div>
                <strong>Required at move-in</strong>
                <ul className="list-disc pl-5 mt-1">
                  <li>Signed Form 1AA (tenancy agreement)</li>
                  <li>Form 1AC / 1AD given</li>
                  <li>Property Condition Report (2 copies) — give to tenant</li>
                  <li>Bond lodgement & receipt</li>
                  <li>First rent receipt</li>
                  <li>Keys & key receipt</li>
                  <li>Move-in photos / video (dated)</li>
                </ul>
              </div>

              <div>
                <strong>Simple move-in signature block</strong>
                <div className="mt-2 border rounded p-3">
                  <div className="text-sm">
                    Lessor/Manager: ____________________ Date: __________
                  </div>
                  <div className="mt-2 text-sm">Tenant: ____________________ Date: __________</div>
                </div>
              </div>

              <div>
                <strong>Short house rules (attach to Form 1AA)</strong>
                <pre className="mt-2 whitespace-pre-wrap text-xs bg-slate-50 p-2 rounded">
                  {houseRules}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Move-Out Modal */}
      {showMoveOutModal && selectedRoomId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 shadow-lg print:bg-white">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-bold">Move-Out Pack — Room {selectedRoomId}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowMoveOutModal(false)}
                  className="px-3 py-1 text-sm rounded bg-slate-200">
                  Close
                </button>
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="px-3 py-1 text-sm rounded bg-slate-800 text-white">
                  Print
                </button>
              </div>
            </div>

            <div className="mt-4 text-sm space-y-2">
              <div>
                <strong>Move-out steps</strong>
                <ul className="list-disc pl-5 mt-1">
                  <li>Confirm move-out date in writing</li>
                  <li>Send move-out checklist at least 14 days before</li>
                  <li>Arrange pre-inspection (optional)</li>
                  <li>Final inspection within 14 days of vacating (compare Form 1)</li>
                  <li>Return keys and finalise bond via Bond Administrator</li>
                </ul>
              </div>

              <div>
                <strong>Final inspection signature block</strong>
                <div className="mt-2 border rounded p-3">
                  <div className="text-sm">
                    Lessor/Manager: ____________________ Date: __________
                  </div>
                  <div className="mt-2 text-sm">Tenant: ____________________ Date: __________</div>
                </div>
              </div>

              <div>
                <strong>Claiming against bond — evidence needed</strong>
                <ul className="list-disc pl-5 mt-1 text-xs">
                  <li>Move-in & move-out photos with dates</li>
                  <li>Itemised invoices/receipts for repairs</li>
                  <li>Signed property condition reports</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable,
          .printable * {
            visibility: visible;
          }
        }
      `}</style>
    </div>
  );
}
