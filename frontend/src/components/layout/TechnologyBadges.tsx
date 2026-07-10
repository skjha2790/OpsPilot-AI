import { Code2, Container, Cpu, GitBranch, Shield, Swords, Workflow } from 'lucide-react';

const badges = [
  { label: 'React', icon: Code2 },
  { label: 'TypeScript', icon: Code2 },
  { label: 'FastAPI', icon: Workflow },
  { label: 'OpenAI', icon: Cpu },
  { label: 'Kubernetes', icon: Container },
  { label: 'Agent Architecture', icon: Shield },
  { label: 'Docker', icon: Swords },
  { label: 'Helm', icon: GitBranch },
];

export function TechnologyBadges() {
  return (
    <div className="flex flex-wrap gap-3">
      {badges.map((badge) => {
        const Icon = badge.icon;
        return (
          <span
            key={badge.label}
            className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-[#F8FBFF] px-3 py-2 text-xs font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
          >
            <Icon className="h-3.5 w-3.5 text-[#4F46E5]" />
            {badge.label}
          </span>
        );
      })}
    </div>
  );
}
