import type { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  subtitle?: string;
}

const colorMap = {
  primary: 'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200',
  secondary: 'bg-secondary-50 text-secondary-600 dark:bg-secondary-900/30 dark:text-secondary-200',
  success: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300',
  warning: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
  danger: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300',
  info: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
};

const iconColorMap = {
  primary: 'text-primary-600 dark:text-primary-200',
  secondary: 'text-secondary-500 dark:text-secondary-200',
  success: 'text-green-500 dark:text-green-300',
  warning: 'text-amber-500 dark:text-amber-300',
  danger: 'text-red-500 dark:text-red-300',
  info: 'text-blue-500 dark:text-blue-300',
};

export default function KPICard({ title, value, icon: Icon, color, subtitle }: KPICardProps) {
  return (
    <div className="card group min-h-[116px] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:hover:border-slate-600">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg transition-transform duration-200 group-hover:scale-105 ${colorMap[color]}`}>
          <Icon className={`w-5 h-5 ${iconColorMap[color]}`} />
        </div>
      </div>
    </div>
  );
}
