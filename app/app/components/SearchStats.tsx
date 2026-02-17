'use client';

import { useSearchContext } from '@/app/context/SearchContext';

export default function SearchStats() {
  const { total, loading, query, movies } = useSearchContext();

  if (loading && movies.length === 0) return null;
  if (!query && movies.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
      {total > 0 && (
        <span>
          <strong className="text-text-primary">{total.toLocaleString()}</strong> results
        </span>
      )}
    </div>
  );
}
