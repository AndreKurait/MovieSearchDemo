'use client';

import { useSearchContext } from '@/app/context/SearchContext';
import MovieCard from './MovieCard';

export default function MovieGrid() {
  const { movies, loading, hasMore, loadMore } = useSearchContext();

  if (movies.length === 0 && !loading) return null;

  return (
    <div>
      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
        {movies.map((movie) => (
          <div key={movie.id} className="fade-in">
            <MovieCard movie={movie} />
          </div>
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-8 py-3 bg-accent-primary text-white rounded-xl font-medium
                       hover:bg-accent-primary-hover disabled:opacity-50
                       transition-all shadow-md hover:shadow-lg"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Loading...
              </span>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
