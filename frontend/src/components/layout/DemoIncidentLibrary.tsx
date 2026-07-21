import { BookOpen, CheckCircle2, Flame, MemoryStick, Network, PackageSearch, ShieldAlert, Timer } from 'lucide-react';

import type { DemoIncidentScenario } from '../../demo/incidents';

function getIcon(id: string) {
  if (id === 'crashloopbackoff') return Flame;
  if (id === 'imagepullbackoff') return PackageSearch;
  if (id === 'oomkilled') return MemoryStick;
  if (id === 'pendingpods') return Timer;
  if (id === 'nodenotready') return Network;
  return ShieldAlert;
}

function getSeverityTone(severity: DemoIncidentScenario['severity']) {
  if (severity === 'P0') return 'bg-[#EF4444] text-white';
  if (severity === 'P1') return 'bg-[#F59E0B] text-white';
  return 'bg-[#60A5FA] text-white';
}

export function DemoIncidentLibrary({
  incidents,
  selectedId,
  onSelect,
}: {
  incidents: DemoIncidentScenario[];
  selectedId: string;
  onSelect: (incident: DemoIncidentScenario) => void;
}) {
  return (
    <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FBFF] p-2 text-indigo-600">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">Incident Library</p>
            <p className="mt-1 text-sm text-slate-700">Select a production incident scenario to investigate</p>
          </div>
        </div>
        <div className="rounded-full border border-[#E2E8F0] bg-[#F8FBFF] px-3 py-1 text-xs font-medium text-slate-700">
          {incidents.length} scenarios
        </div>
      </div>

      <div className="scrollbar-slim mt-5 grid max-h-[560px] grid-cols-1 gap-4 overflow-y-auto overflow-x-hidden pr-1">
        {incidents.map((incident) => {
          const selected = incident.id === selectedId;
          const Icon = getIcon(incident.id);
          return (
            <button
              key={incident.id}
              type="button"
              onClick={() => onSelect(incident)}
              className={`group flex w-full min-h-[172px] items-start gap-4 rounded-xl border p-5 text-left shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition duration-200 hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md ${
                selected ? 'border-[#4F46E5] bg-[#EFF6FF] shadow-[0_0_0_4px_rgba(96,165,250,0.16)]' : 'border-[#E2E8F0] bg-white'
              }`}
            >
              <div
                className={`mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
                  selected ? 'border-[#4F46E5]/25 bg-white text-[#4F46E5]' : 'border-[#E2E8F0] bg-[#F8FBFF] text-slate-700'
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 max-w-[calc(100%-5rem)] break-words line-clamp-2 text-[17px] font-semibold leading-7 text-slate-900">
                    {incident.title}
                  </p>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${getSeverityTone(incident.severity)}`}>
                      {incident.severity}
                    </span>
                    {selected ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#4F46E5] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#4F46E5]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Selected
                      </span>
                    ) : null}
                  </div>
                </div>

                <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-slate-700">{incident.summary}</p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#CBD5E1] bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-800">
                    Confidence {incident.confidence}%
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
