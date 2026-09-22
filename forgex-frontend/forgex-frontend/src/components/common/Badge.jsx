const tones = {
  ok: 'bg-ok-tint text-ok',
  warn: 'bg-warn-tint text-warn',
  danger: 'bg-forge-tint text-forge',
  info: 'bg-[#EAF0FB] text-[#264C8C]',
  muted: 'bg-paper text-steel',
};

export default function Badge({ tone = 'muted', children }) {
  return <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-sm font-medium ${tones[tone]}`}>{children}</span>;
}
