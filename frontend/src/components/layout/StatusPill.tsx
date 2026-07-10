import type { HealthStatus } from '../../services/platformStatusService';

function tone(status: HealthStatus) {
  if (status === 'green') return 'border-[#DCFCE7] bg-[#DCFCE7] text-[#166534]';
  if (status === 'yellow') return 'border-[#FEF3C7] bg-[#FEF3C7] text-[#92400E]';
  return 'border-[#FEE2E2] bg-[#FEE2E2] text-[#991B1B]';
}

export function StatusPill({ label, status }: { label: string; status: HealthStatus }) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 ${tone(status)}`}
    >
      <span className="h-2.5 w-2.5 rounded-full bg-current shadow-[0_0_0_4px_rgba(15,23,42,0.06)]" />
      <span className="tracking-wide">{label}</span>
    </div>
  );
}
