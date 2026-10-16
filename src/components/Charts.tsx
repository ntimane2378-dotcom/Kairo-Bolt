import { useMemo } from 'react';

interface PriceChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  showAxis?: boolean;
  className?: string;
}

export function Sparkline({ data, color = '#10b981', className = '' }: PriceChartProps) {
  const path = useMemo(() => {
    if (data.length < 2) return '';
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const w = 100;
    const h = 30;
    return data
      .map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((v - min) / range) * h;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  }, [data]);

  const isPositive = data.length > 1 && data[data.length - 1] >= data[0];
  const strokeColor = color === 'auto' ? (isPositive ? '#10b981' : '#ef4444') : color;

  return (
    <svg viewBox="0 0 100 30" className={className} preserveAspectRatio="none">
      <path d={path} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PriceChart({
  data,
  width = 800,
  height = 300,
  color = '#3b82f6',
  fill = true,
  showAxis = true,
  className = '',
}: PriceChartProps) {
  const { linePath, areaPath, min, max, points } = useMemo(() => {
    if (data.length < 2) return { linePath: '', areaPath: '', min: 0, max: 0, points: [] as { x: number; y: number; v: number }[] };
    const padding = { top: 20, right: 10, bottom: showAxis ? 30 : 10, left: showAxis ? 60 : 10 };
    const w = width - padding.left - padding.right;
    const h = height - padding.top - padding.bottom;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((v, i) => ({
      x: padding.left + (i / (data.length - 1)) * w,
      y: padding.top + h - ((v - min) / range) * h,
      v,
    }));

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
    const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(2)},${padding.top + h} L${points[0].x.toFixed(2)},${padding.top + h} Z`;

    return { linePath, areaPath, min, max, points };
  }, [data, width, height, showAxis]);

  if (data.length < 2) {
    return <div className={`flex items-center justify-center text-slate-500 ${className}`} style={{ width, height }}>No chart data available</div>;
  }

  const gradientId = `chart-gradient-${Math.random().toString(36).substr(2, 9)}`;
  const isPositive = data[data.length - 1] >= data[0];
  const strokeColor = color === 'auto' ? (isPositive ? '#10b981' : '#ef4444') : color;

  const padding = { top: 20, right: 10, bottom: showAxis ? 30 : 10, left: showAxis ? 60 : 10 };
  const h = height - padding.top - padding.bottom;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>

      {showAxis && (
        <>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = padding.top + h * t;
            const value = max - (max - min) * t;
            return (
              <g key={t}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
                <text x={padding.left - 8} y={y + 4} fill="#64748b" fontSize="11" textAnchor="end" fontFamily="monospace">
                  ${value < 1 ? value.toFixed(4) : value.toFixed(2)}
                </text>
              </g>
            );
          })}
        </>
      )}

      {fill && <path d={areaPath} fill={`url(#${gradientId})`} />}
      <path d={linePath} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {points.length > 0 && (
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="4"
          fill={strokeColor}
          className="animate-pulse"
        />
      )}
    </svg>
  );
}

interface ScenarioChartProps {
  scenarios: { shortTerm: number; midTerm: number; longTerm: number; type: string }[];
  currentPrice: number;
  className?: string;
}

export function ScenarioChart({ scenarios, currentPrice, className = '' }: ScenarioChartProps) {
  const width = 600;
  const height = 250;
  const padding = { top: 30, right: 120, bottom: 40, left: 70 };
  const w = width - padding.left - padding.right;
  const h = height - padding.top - padding.bottom;

  const allPrices = [currentPrice, ...scenarios.flatMap((s) => [s.shortTerm, s.midTerm, s.longTerm])];
  const min = Math.min(...allPrices) * 0.95;
  const max = Math.max(...allPrices) * 1.05;
  const range = max - min || 1;

  const labels = ['Now', '1W', '1M', '3M'];
  const xStep = w / (labels.length - 1);

  const colors: Record<string, string> = { bull: '#10b981', neutral: '#f59e0b', bear: '#ef4444' };

  const yForPrice = (price: number) => padding.top + h - ((price - min) / range) * h;
  const xForIndex = (i: number) => padding.left + i * xStep;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} preserveAspectRatio="xMidYMid meet">
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = padding.top + h * t;
        const value = max - range * t;
        return (
          <g key={t}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
            <text x={padding.left - 8} y={y + 4} fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">
              ${value.toFixed(value < 1 ? 4 : 0)}
            </text>
          </g>
        );
      })}

      <line
        x1={padding.left} y1={yForPrice(currentPrice)}
        x2={width - padding.right} y2={yForPrice(currentPrice)}
        stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="6 3"
      />
      <text x={width - padding.right + 5} y={yForPrice(currentPrice) + 4} fill="#3b82f6" fontSize="10" fontFamily="monospace">
        Now
      </text>

      {labels.map((label, i) => (
        <text key={i} x={xForIndex(i)} y={height - 12} fill="#94a3b8" fontSize="11" textAnchor="middle">
          {label}
        </text>
      ))}

      {scenarios.map((scenario) => {
        const color = colors[scenario.type] || '#94a3b8';
        const points = [
          { x: xForIndex(0), y: yForPrice(currentPrice) },
          { x: xForIndex(1), y: yForPrice(scenario.shortTerm) },
          { x: xForIndex(2), y: yForPrice(scenario.midTerm) },
          { x: xForIndex(3), y: yForPrice(scenario.longTerm) },
        ];
        const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
        const labelY = points[3].y;
        const labelColor = scenario.type;

        return (
          <g key={scenario.type}>
            <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
            {points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
            ))}
            <text
              x={width - padding.right + 5}
              y={labelY + 4}
              fill={colors[labelColor]}
              fontSize="10"
              fontFamily="monospace"
            >
              {scenario.type === 'bull' ? 'Bull' : scenario.type === 'bear' ? 'Bear' : 'Neutral'}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
