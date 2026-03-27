import { useMemo } from 'react';

export default function BeadCounter({ cells, colors, t }) {
  const counts = useMemo(() => {
    const map = {};
    for (const color of Object.values(cells)) {
      map[color] = (map[color] || 0) + 1;
    }
    return map;
  }, [cells]);

  const activeColors = colors.filter((c) => counts[c.hex]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <aside className="w-[190px] flex-shrink-0 bg-studio-panel border-l border-studio-border flex flex-col overflow-hidden">
      <div className="px-3 py-3 border-b border-studio-border flex-shrink-0">
        <h3 className="text-[11px] font-semibold text-studio-muted uppercase tracking-wider">
          {t.beadCounter}
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeColors.length === 0 ? (
          <p className="px-3 py-4 text-xs text-studio-muted text-center">{t.noBeads}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-studio-panel">
              <tr className="text-[10px] text-studio-muted uppercase tracking-wide border-b border-studio-border">
                <th className="pl-3 py-2 text-left w-8">{t.color}</th>
                <th className="px-2 py-2 text-left">{t.name}</th>
                <th className="pr-3 py-2 text-right">{t.count}</th>
              </tr>
            </thead>
            <tbody>
              {activeColors.map((c) => (
                <tr key={c.id} className="border-b border-studio-border/50 hover:bg-studio-border/30 transition-colors">
                  <td className="pl-3 py-2">
                    <div
                      className="w-5 h-5 rounded-full border border-studio-border shadow"
                      style={{ backgroundColor: c.hex }}
                    />
                  </td>
                  <td className="px-2 py-2 text-studio-muted text-xs truncate max-w-[80px]">
                    {c.name || t.noName}
                  </td>
                  <td className="pr-3 py-2 text-right font-mono text-studio-text text-xs font-semibold">
                    {counts[c.hex].toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Total */}
      {total > 0 && (
        <div className="px-3 py-2.5 border-t border-studio-border flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-studio-muted font-medium">{t.total}</span>
          <span className="text-sm font-bold text-studio-accent font-mono">{total.toLocaleString()}</span>
        </div>
      )}
    </aside>
  );
}
