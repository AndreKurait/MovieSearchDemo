'use client';

import { useState, useEffect } from 'react';
import type { Movie } from '@/lib/elasticsearch';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export default function SimilarMovies({ movieId, onMovieClick }: { movieId: string; onMovieClick: (movie: Movie) => void }) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/movies/${movieId}/similar?limit=8`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled) {
          setMovies(data.movies || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [movieId]);

  if (loading) {
    return (
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-3">Similar Movies</h3>
        <div className="flex gap-3 overflow-x-auto genre-scroll pb-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-28">
              <div className="aspect-[2/3] rounded-lg skeleton mb-1" />
              <div className="h-3 skeleton rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (movies.length === 0) return null;

  return (
    <div>
      <h3 className="text-lg font-semibold text-text-primary mb-3">Similar Movies</h3>
      <div className="flex gap-3 overflow-x-auto genre-scroll pb-2">
        {movies.map(movie => (
          <button
            key={movie.id}
            onClick={() => onMovieClick(movie)}
            className="flex-shrink-0 w-28 text-left group focus:outline-none"
          >
            <div className="aspect-[2/3] rounded-lg overflow-hidden bg-bg-tertiary mb-1">
              {movie.poster_path ? (
                <img
                  src={`${TMDB_IMAGE_BASE}/w185${movie.poster_path}`}
                  alt={movie.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-tertiary text-xs">
                  No Image
                </div>
              )}
            </div>
            <p className="text-xs text-text-primary line-clamp-1 group-hover:text-accent-primary transition-colors">
              {movie.title}
            </p>
            {movie.vote_average !== undefined && movie.vote_average > 0 && (
              <p className="text-[10px] text-text-tertiary">{movie.vote_average.toFixed(1)}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
