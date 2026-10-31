/**
 * A product's daily sales from TikTok's daily top-100 lists (owner, 1 Nov 2026): the middle of TikTok's GMV range as a line, the
 * range itself shaded, and a gap on any day it wasn't in a top 100. Estimated, as the note under it says.
 */
export function GmvSpark({ points, ranges, width = 96, height = 32, label, days }: {
  points: (number | null)[]; ranges?: ([number, number] | null)[]; width?: number; height?: number; label?: string; days?: string[];
}) {
  const n = points.length;
  const top = Math.max(1, ...(ranges ?? []).map((r) => (r ? r[1] : 0)), ...points.map((v) => v ?? 0));
  const x = (i: number) => (n <= 1 ? width / 2 : 2 + (i * (width - 4)) / (n - 1));
  const y = (v: number) => height - 3 - (v / top) * (height - 6);
  // Runs of days that were in a top 100, drawn separately so missing days leave a gap.
  const runs: number[][] = [];
  points.forEach((v, i) => {
    if (v == null) return;
    const last = runs[runs.length - 1];
    if (last && last[last.length - 1] === i - 1) last.push(i);
    else runs.push([i]);
  });
  const known = points.filter((v): v is number => v != null);
  const aria = label ?? `Sales, last ${n} days: ${known.length ? `${known.length} of ${n} days in TikTok's top 100` : "not in TikTok's top 100"}`;
  return (
    <svg className="gs" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={aria}>
      <line x1="0" x2={width} y1={height - 3} y2={height - 3} className="gs-base" />
      {ranges && runs.map((r) => {
        const band = r.filter((i) => ranges[i]);
        if (!band.length) return null;
        const up = band.map((i) => `${x(i)},${y(ranges[i]![1])}`);
        const down = [...band].reverse().map((i) => `${x(i)},${y(ranges[i]![0])}`);
        return band.length > 1 ? <polygon key={`b${r[0]}`} className="gs-band" points={[...up, ...down].join(" ")} /> : <line key={`b${r[0]}`} className="gs-band-1" x1={x(band[0])} x2={x(band[0])} y1={y(ranges[band[0]]![1])} y2={y(ranges[band[0]]![0])} />;
      })}
      {runs.map((r) => (r.length > 1 ? <polyline key={`l${r[0]}`} className="gs-line" points={r.map((i) => `${x(i)},${y(points[i]!)}`).join(" ")} /> : null))}
      {runs.map((r) => r.map((i) => <circle key={`d${i}`} className="gs-dot" cx={x(i)} cy={y(points[i]!)} r={r.length > 1 && i !== r[r.length - 1] ? 1.2 : 2.2}>{days && <title>{`${days[i]}: about RM ${Math.round(points[i]!).toLocaleString("en-MY")}`}</title>}</circle>))}
    </svg>
  );
}
