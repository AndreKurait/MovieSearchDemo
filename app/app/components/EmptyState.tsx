'use client';

export default function EmptyState({ query }: { query: string }) {
  if (query) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-text-tertiary mb-4 opacity-50">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
        <h3 className="text-lg font-semibold text-text-primary mb-1">No movies found</h3>
        <p className="text-text-secondary max-w-md">
          No results for &ldquo;{query}&rdquo;. Try different keywords or adjust your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-6">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-accent-primary opacity-40">
          <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
          <line x1="7" y1="2" x2="7" y2="22" />
          <line x1="17" y1="2" x2="17" y2="22" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <line x1="2" y1="7" x2="7" y2="7" />
          <line x1="2" y1="17" x2="7" y2="17" />
          <line x1="17" y1="7" x2="22" y2="7" />
          <line x1="17" y1="17" x2="22" y2="17" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-text-primary mb-2">Discover Movies</h2>
      <p className="text-text-secondary max-w-md mb-1">
        Search for any movie by title, plot, or theme.
      </p>
      <p className="text-text-tertiary text-sm">
        Try &ldquo;space adventure&rdquo;, &ldquo;romantic comedy in Paris&rdquo;, or &ldquo;mind-bending thriller&rdquo;
      </p>
    </div>
  );
}
