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
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200"
          >
            <Icon className="h-3.5 w-3.5 text-cyan-300" />
            {badge.label}
          </span>
        );
      })}
    </div>
  );
}
