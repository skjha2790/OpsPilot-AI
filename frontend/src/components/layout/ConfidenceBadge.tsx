interface ConfidenceBadgeProps {
  confidence: number;
}

function getTone(confidence: number) {
  if (confidence >= 80) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }

  if (confidence >= 50) {
    return 'border-amber-200 bg-amber-50 text-amber-800';
  }

  return 'border-rose-200 bg-rose-50 text-rose-800';
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  return (
    <div className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${getTone(confidence)}`}>
      {confidence}%
    </div>
  );
}
