"use client";

type GearProps = {
  teeth?: number;
  className?: string;
};

/** Gear SVG — inherits `currentColor`. Shared by RouteBackground and ComingSoon. */
export default function Gear({ teeth = 12, className }: GearProps) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <circle cx={100} cy={100} r={64} fill="none" stroke="currentColor" strokeWidth={16} />
      {Array.from({ length: teeth }, (_, i) => (
        <rect
          key={i}
          x={92}
          y={14}
          width={16}
          height={26}
          rx={4}
          fill="currentColor"
          transform={`rotate(${(360 / teeth) * i} 100 100)`}
        />
      ))}
      <circle cx={100} cy={100} r={24} fill="none" stroke="currentColor" strokeWidth={10} />
    </svg>
  );
}
