export function OccupancyRing({ value, label }: { value: number; label: string }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;
  return (
    <svg className="ring" viewBox="0 0 100 100" role="img" aria-label={label}>
      <circle className="ring-track" cx="50" cy="50" r={radius} />
      <circle
        className={value >= 85 ? "ring-value hot" : "ring-value"}
        cx="50"
        cy="50"
        r={radius}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
      <text x="50" y="55" textAnchor="middle" aria-hidden="true">
        {value}%
      </text>
    </svg>
  );
}
