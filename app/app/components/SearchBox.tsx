'use client';

import { useRef, useEffect } from 'react';
import { useSearchContext } from '@/app/context/SearchContext';
import { useDebounce } from '@/app/hooks/useDebounce';

export default function SearchBox() {
  const { query, setQuery, performSearch, loading } = useSearchContext();
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevDebouncedRef = useRef(debouncedQuery);

  // Auto-search on debounced query change
  useEffect(() => {
    if (debouncedQuery !== prevDebouncedRef.current) {
      prevDebouncedRef.current = debouncedQuery;
      performSearch(debouncedQuery);
    }
  }, [debouncedQuery, performSearch]);

  // Focus on Cmd/Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        {/* Search icon */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search movies... (Cmd+K)"
          className="w-full pl-12 pr-20 py-3.5 bg-bg-input border border-border-primary rounded-xl
                     text-text-primary placeholder-text-tertiary
                     focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary
                     transition-all text-base"
          autoComplete="off"
        />

        {/* Loading spinner or clear button */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {loading && (
            <div className="w-5 h-5 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
          )}
          {query && !loading && (
            <button
              onClick={() => { setQuery(''); performSearch(''); }}
              className="text-text-tertiary hover:text-text-primary transition-colors"
              aria-label="Clear search"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
          {!query && (
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs text-text-tertiary border border-border-primary rounded">
              /
            </kbd>
          )}
        </div>
      </div>
    </div>
  );
}
