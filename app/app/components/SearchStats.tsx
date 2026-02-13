'use client';

import { useSearchContext } from '@/app/context/SearchContext';

export default function SearchStats() {
  const { total, latency, loading, query, searchMode, movies } = useSearchContext();

  if (loading && movies.length === 0) return null;
  if (!query && movies.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
      {total > 0 && (
        <>
          <span>
            <strong className="text-text-primary">{total.toLocaleString()}</strong> results
          </span>
          <span className="text-text-tertiary">in {latency}ms</span>
        </>
      )}

      {/* Search mode badge */}
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
        searchMode === 'semantic'
          ? 'bg-purple-500/10 text-accent-semantic'
          : searchMode === 'hybrid'
            ? 'bg-indigo-500/10 text-accent-primary'
            : 'bg-blue-500/10 text-accent-keyword'
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${
          searchMode === 'semantic'
            ? 'bg-accent-semantic'
            : searchMode === 'hybrid'
              ? 'bg-accent-primary'
              : 'bg-accent-keyword'
        }`} />
        {searchMode}
      </span>
    </div>
  );
}
