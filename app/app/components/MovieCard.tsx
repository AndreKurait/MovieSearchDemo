'use client';

import { useMovieContext } from '@/app/context/MovieContext';
import type { Movie } from '@/lib/elasticsearch';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

function StarRating({ rating }: { rating: number }) {
  const stars = Math.round(rating / 2);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg
          key={i}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill={i <= stars ? 'var(--rating-star)' : 'none'}
          stroke="var(--rating-star)"
          strokeWidth="2"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
      <span className="ml-1 text-xs text-text-secondary">{rating.toFixed(1)}</span>
    </div>
  );
}

export default function MovieCard({ movie }: { movie: Movie }) {
  const { openMovie } = useMovieContext();
  const year = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
  const posterUrl = movie.poster_path
    ? `${TMDB_IMAGE_BASE}/w342${movie.poster_path}`
    : null;

  return (
    <button
      onClick={() => openMovie(movie)}
      className="group text-left w-full focus:outline-none focus:ring-2 focus:ring-accent-primary/50 rounded-lg transition-all"
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-bg-tertiary mb-2">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={movie.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-tertiary">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-30">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
              <line x1="7" y1="2" x2="7" y2="22" />
              <line x1="17" y1="2" x2="17" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
            </svg>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
          <div className="text-white text-xs line-clamp-3">
            {movie.overview}
          </div>
        </div>

        {/* Rating badge */}
        {movie.vote_average !== undefined && movie.vote_average > 0 && (
          <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white text-xs font-semibold px-1.5 py-0.5 rounded">
            {movie.vote_average.toFixed(1)}
          </div>
        )}
      </div>

      {/* Info below poster */}
      <div className="px-0.5">
        <h3 className="text-sm font-semibold text-text-primary line-clamp-1 group-hover:text-accent-primary transition-colors">
          {movie.title}
        </h3>
        <div className="flex items-center gap-2 mt-0.5">
          {year && <span className="text-xs text-text-tertiary">{year}</span>}
          {movie.vote_average !== undefined && movie.vote_average > 0 && (
            <StarRating rating={movie.vote_average} />
          )}
        </div>
        {movie.genres && movie.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {movie.genres.slice(0, 2).map(g => (
              <span key={g} className="text-[10px] px-1.5 py-0.5 rounded bg-genre-bg text-genre-text">
                {g}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
