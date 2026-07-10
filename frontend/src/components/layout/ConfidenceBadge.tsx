interface ConfidenceBadgeProps {
  confidence: number;
}

function getTone(confidence: number) {
  if (confidence >= 80) {
    return 'border-emerald-400/30 bg-emerald-400/15 text-emerald-200';
  }

  if (confidence >= 50) {
    return 'border-amber-400/30 bg-amber-400/15 text-amber-200';
  }

  return 'border-rose-400/30 bg-rose-400/15 text-rose-200';
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  return (
    <div className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${getTone(confidence)}`}>
      {confidence}%
    </div>
  );
}
