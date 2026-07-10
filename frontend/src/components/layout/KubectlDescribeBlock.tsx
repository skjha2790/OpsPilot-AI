export function KubectlDescribeBlock({ lines }: { lines: string[] }) {
  return (
    <pre className="overflow-auto rounded-2xl border border-[#0F172A] bg-[#0F172A] p-4 font-mono text-[12.5px] leading-6 text-[#F8FAFC] shadow-[0_18px_45px_rgba(15,23,42,0.14)]">
      <code>
        {lines.map((line) => (
          <div key={line} className="whitespace-pre-wrap">
            {line}
          </div>
        ))}
      </code>
    </pre>
  );
}
