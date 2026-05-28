interface PageHeaderProps {
  title: string;
  breadcrumb?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, breadcrumb, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {breadcrumb && (
          <p className="text-sm text-muted-foreground mt-1">
            Dashboard <span className="mx-1">›</span> {breadcrumb}
          </p>
        )}
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
