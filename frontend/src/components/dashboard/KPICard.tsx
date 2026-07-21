import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface KPICardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  subtitle?: string;
  to?: string;
}

const colorMap = {
  primary: 'border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-800 dark:bg-primary-900/40 dark:text-primary-200',
  secondary: 'border-secondary-200 bg-secondary-50 text-secondary-700 dark:border-secondary-800 dark:bg-secondary-900/30 dark:text-secondary-200',
  success: 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  danger: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300',
  info: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
};

const iconColorMap = {
  primary: 'text-primary-600 dark:text-primary-200',
  secondary: 'text-secondary-500 dark:text-secondary-200',
  success: 'text-green-500 dark:text-green-300',
  warning: 'text-amber-500 dark:text-amber-300',
  danger: 'text-red-500 dark:text-red-300',
  info: 'text-blue-500 dark:text-blue-300',
};

export default function KPICard({ title, value, icon: Icon, color, subtitle, to }: KPICardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-5 text-gray-600 dark:text-slate-300">{title}</p>
          <p className="mt-2 text-[28px] font-bold leading-none tracking-tight text-gray-900 tabular-nums dark:text-slate-100">{value}</p>
          {subtitle && <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        <div className={`rounded-xl border p-2.5 ${colorMap[color]}`}>
          <Icon className={`w-5 h-5 ${iconColorMap[color]}`} />
        </div>
      </div>
      {to && <ArrowUpRight className="absolute bottom-4 end-4 h-4 w-4 text-gray-300 transition-colors group-hover:text-primary-600" aria-hidden="true" />}
    </>
  );

  const className = `card group relative min-h-[132px] overflow-hidden p-5 transition-colors hover:border-primary-200 dark:hover:border-primary-800 ${
    to ? 'block cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2' : ''
  }`;

  if (to) {
    return <Link to={to} className={className}>{content}</Link>;
  }

  return <div className={className}>{content}</div>;
}
