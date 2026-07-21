interface ProgressMeterProps {
  value: number;
  label?: string;
  detail?: string;
  compact?: boolean;
}

export default function ProgressMeter({ value, label, detail, compact = false }: ProgressMeterProps) {
  const safeValue = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div className="min-w-0" aria-label={label || `${safeValue}%`}>
      {(label || detail) && (
        <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
          <span className="font-semibold text-gray-700 dark:text-slate-200">{label}</span>
          <span className="tabular-nums text-gray-500 dark:text-slate-400">{detail || `${safeValue}%`}</span>
        </div>
      )}
      <div className={`${compact ? 'h-1.5' : 'h-2'} overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700`}>
        <div
          className="h-full rounded-full bg-primary-600 transition-[width] duration-300"
          style={{ width: `${safeValue}%` }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={safeValue}
        />
      </div>
    </div>
  );
}
