import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  loading?: boolean;
}

export default function MetricCard({
  title,
  value,
  icon: Icon,
  loading = false,
}: MetricCardProps) {
  return (
    <article className="metric-card">
      <div className="metric-card__icon">
        <Icon size={34} />
      </div>

      <div className="metric-card__content">
        <h3>{title}</h3>
        <strong>{loading ? '...' : value.toLocaleString('es-EC')}</strong>
      </div>
    </article>
  );
}
