import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";

export const Route = createFileRoute("/seat-layouts")({
  head: () => ({
    meta: [
      { title: "Seat Layouts — KenRoute" },
      { name: "description", content: "Configure bus seat layouts for sleeper and seater types." },
    ],
  }),
  component: SeatLayoutsPage,
});

function Bus({ title, rows, cols, sleeper }: { title: string; rows: number; cols: number; sleeper?: boolean }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{rows * cols} seats · {sleeper ? "Sleeper" : "Seater"}</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-brand" /> Available</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-muted border border-border" /> Empty</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-danger/40" /> Booked</span>
        </div>
      </div>
      <div className="border-2 border-dashed border-border rounded-xl p-5">
        <div className="flex justify-end mb-4 text-xs text-muted-foreground">Driver →</div>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: rows * cols }).map((_, i) => {
            const states = ["brand", "muted", "danger"];
            const s = states[i % 5 === 0 ? 2 : i % 3 === 0 ? 1 : 0];
            return (
              <div
                key={i}
                className={`h-10 rounded-md flex items-center justify-center text-[10px] font-semibold ${
                  s === "brand" ? "bg-brand/15 text-brand border border-brand/30" :
                  s === "muted" ? "bg-muted text-muted-foreground border border-border" :
                  "bg-danger/15 text-danger border border-danger/30"
                }`}
              >
                {i + 1}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SeatLayoutsPage() {
  return (
    <>
      <PageHeader title="Seat Layouts" breadcrumb="Seat Layouts" subtitle="Configure layouts for your bus fleet" />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Bus title="Sleeper 2+1 · TS 09 AB 1234" rows={10} cols={4} sleeper />
        <Bus title="Seater 2+2 · TS 09 CD 5678" rows={11} cols={4} />
      </div>
    </>
  );
}
