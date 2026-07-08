interface ConfidenceBadgeProps {
  confidence: number;
}

function getTone(confidence: number) {
  if (confidence >= 80) {
    return 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30';
  }

  if (confidence >= 50) {
    return 'bg-amber-500/15 text-amber-300 ring-amber-400/30';
  }

  return 'bg-rose-500/15 text-rose-300 ring-rose-400/30';
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  return (
    <div className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ring-1 ${getTone(confidence)}`}>
      {confidence}%
    </div>
  );
}

