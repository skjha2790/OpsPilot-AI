function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlightYaml(yaml: string) {
  const escaped = escapeHtml(yaml);
  return escaped
    .replace(/(^\s*#.*$)/gm, '<span class="text-slate-500">$1</span>')
    .replace(/(^\s*[-\w.]+)(\s*:)/gm, '<span class="text-sky-200 font-semibold">$1</span><span class="text-slate-300">$2</span>')
    .replace(/:\s*("[^"]*"|'[^']*')/g, ': <span class="text-emerald-200">$1</span>')
    .replace(/:\s*([0-9]+)\b/g, ': <span class="text-amber-200">$1</span>')
    .replace(/:\s*(true|false|null)\b/g, ': <span class="text-rose-200">$1</span>');
}

export function YamlCodeBlock({ yaml }: { yaml: string }) {
  return (
    <pre className="overflow-auto rounded-2xl border border-[#0F172A] bg-[#0F172A] p-4 font-mono text-[12.5px] leading-6 text-[#F8FAFC] shadow-[0_18px_45px_rgba(15,23,42,0.14)]">
      <code dangerouslySetInnerHTML={{ __html: highlightYaml(yaml) }} />
    </pre>
  );
}
