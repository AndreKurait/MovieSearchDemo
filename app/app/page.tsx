'use client';

import { SearchProvider, useSearchContext } from '@/app/context/SearchContext';
import { ThemeProvider } from '@/app/context/ThemeContext';
import { MovieProvider } from '@/app/context/MovieContext';
import Header from '@/app/components/Header';
import SearchStats from '@/app/components/SearchStats';
import GenreFilter from '@/app/components/GenreFilter';
import MovieGrid from '@/app/components/MovieGrid';
import MovieModal from '@/app/components/MovieModal';
import LoadingSkeleton from '@/app/components/LoadingSkeleton';
import EmptyState from '@/app/components/EmptyState';

function SearchResults() {
  const { movies, loading, query, total } = useSearchContext();
  const showEmpty = !loading && movies.length === 0;
  const showSkeleton = loading && movies.length === 0;

  return (
    <>
      {/* Stats + Filters bar */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SearchStats />
        </div>
        <GenreFilter />
      </div>

      {/* Results */}
      {showSkeleton && <LoadingSkeleton />}
      {showEmpty && <EmptyState query={query} />}
      {movies.length > 0 && <MovieGrid />}

      {/* Total count footer */}
      {total > 0 && movies.length > 0 && (
        <div className="text-center text-sm text-text-tertiary mt-8 pb-8">
          Showing {movies.length.toLocaleString()} of {total.toLocaleString()} movies
        </div>
      )}
    </>
  );
}

export default function Home() {
  return (
    <ThemeProvider>
      <SearchProvider>
        <MovieProvider>
          <div className="min-h-screen bg-bg-primary">
            <Header />
            <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
              <SearchResults />
            </main>
            <MovieModal />
          </div>
        </MovieProvider>
      </SearchProvider>
    </ThemeProvider>
  );
}
