import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  icon?: LucideIcon;
  meta?: ReactNode;
  actions?: ReactNode;
}

export default function PageHeader({
  title,
  description,
  eyebrow,
  icon: Icon,
  meta,
  actions,
}: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-end sm:justify-between dark:border-slate-700">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 hidden h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 sm:inline-flex dark:bg-primary-900/40 dark:text-primary-200">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-gray-900 sm:text-[28px] dark:text-slate-100">
            {title}
          </h1>
          {description && <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500 dark:text-slate-400">{description}</p>}
          {meta && <div className="mt-2 text-xs text-gray-500 dark:text-slate-400">{meta}</div>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
    </header>
  );
}
