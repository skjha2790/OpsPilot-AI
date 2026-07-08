const badges = ['React', 'TypeScript', 'FastAPI', 'OpenAI', 'Kubernetes', 'Agent Architecture'];

export function TechnologyBadges() {
  return (
    <div className="flex flex-wrap gap-3">
      {badges.map((badge) => (
        <span
          key={badge}
          className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-100"
        >
          {badge}
        </span>
      ))}
    </div>
  );
}

