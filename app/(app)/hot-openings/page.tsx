import { PageHeader, PageShell } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Flame, Briefcase, Users, Star, MapPin } from "@/components/icons";
import {
  HOT_OPENINGS, openingSeats, clientSeats, stateSeats,
  grandTotalSeats, distinctClientCount, type HotState,
} from "@/lib/hot-openings";

export default function HotOpeningsPage() {
  const states: HotState[] = [...HOT_OPENINGS].sort(
    (a, b) => stateSeats(b) - stateSeats(a) || a.state.localeCompare(b.state),
  );

  const seats = grandTotalSeats();
  const clients = distinctClientCount();
  const roles = HOT_OPENINGS.reduce(
    (n, s) => n + s.clients.reduce((m, c) => m + c.openings.length, 0), 0,
  );
  const hottest = states[0];

  return (
    <PageShell>
      <PageHeader
        title="Hot Openings"
        subtitle={`${seats} open seats across ${clients} clients in ${HOT_OPENINGS.length} states. Live GAL USA hot list.`}
      />

      {/* Summary */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Open Seats" value={seats} accent="blue" icon={<Flame width={17} height={17} />} sub="all clients" />
        <StatCard label="Roles Posted" value={roles} accent="cyan" icon={<Briefcase width={17} height={17} />} sub="distinct positions" />
        <StatCard label="Clients Hiring" value={clients} accent="violet" icon={<Users width={17} height={17} />} sub={`across ${HOT_OPENINGS.length} states`} />
        <StatCard label="Hottest State" value={hottest ? stateSeats(hottest) : 0} accent="emerald" icon={<Star width={17} height={17} />} sub={hottest ? `${hottest.state} seats` : "—"} />
      </div>

      {/* State -> Client -> roles */}
      <div className="mt-7 space-y-7">
        {states.map((s) => {
          const sSeats = stateSeats(s);
          return (
            <section key={s.code}>
              {/* State header */}
              <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <MapPin width={18} height={18} className="text-warn" />
                <h2 className="font-display text-[19px] font-extrabold tracking-tight text-ink">{s.state}</h2>
                <Badge tone="warn">{sSeats} {sSeats === 1 ? "seat" : "seats"}</Badge>
                <span className="text-[12px] text-faint">
                  {s.clients.length} {s.clients.length === 1 ? "client" : "clients"}
                </span>
                <span className="text-[12px] text-faint">· Min wage {s.minWage}</span>
                {s.note && <Badge tone="ok">{s.note}</Badge>}
              </div>

              {/* Clients */}
              <div className="space-y-3">
                {s.clients.map((c) => (
                  <Card key={c.client + c.city} className="overflow-hidden">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-line bg-surface-2/40 px-4 py-3">
                      <h3 className="font-display text-[15px] font-bold text-ink">{c.client}</h3>
                      <span className="text-[12.5px] text-muted">{c.city}</span>
                      <Badge tone="neutral">{clientSeats(c)}</Badge>
                      {c.hold && <Badge tone="bad">On Hold</Badge>}
                      {c.sales && <Badge tone="info">Sales Request</Badge>}
                      {c.note && (
                        <span className="ml-auto text-[11.5px] font-medium text-warn">{c.note}</span>
                      )}
                    </div>

                    <ul className="divide-y divide-line">
                      {c.openings.map((o, i) => {
                        const n = openingSeats(o);
                        return (
                          <li key={i} className="flex items-start gap-3 px-4 py-2.5">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[14px] font-semibold text-ink">{o.position}</span>
                                {n > 1 && <Badge tone="accent">×{n}</Badge>}
                                {o.city && o.city !== c.city && (
                                  <span className="text-[11.5px] text-faint">({o.city})</span>
                                )}
                              </div>
                              {o.detail && <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{o.detail}</p>}
                            </div>
                            <div className="shrink-0 pt-0.5 text-right">
                              {o.pay
                                ? <span className="font-display text-[14px] font-bold text-accent nums">{o.pay}</span>
                                : <span className="text-[12px] text-faint">Pay TBD</span>}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <p className="mt-6 px-1 text-[12px] text-muted">
        Synced from the GAL USA Master Tracker (HOT List). Grouped by state, then client.
      </p>
    </PageShell>
  );
}
