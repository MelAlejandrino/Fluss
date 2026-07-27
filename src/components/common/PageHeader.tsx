interface PageHeaderProps {
  title: string;
  description?: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="font-display text-3xl text-on-surface">{title}</h1>
      {description && (
        <p className="mt-1 max-w-xl text-sm text-on-surface-variant">{description}</p>
      )}
    </div>
  );
}
