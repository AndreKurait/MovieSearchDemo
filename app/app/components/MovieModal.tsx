'use client';

import { useEffect, useCallback } from 'react';
import { useMovieContext } from '@/app/context/MovieContext';
import SimilarMovies from './SimilarMovies';
import type { Movie } from '@/lib/elasticsearch';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

function StarRating({ rating }: { rating: number }) {
  const stars = Math.round(rating / 2);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <svg
          key={i}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={i <= stars ? 'var(--rating-star)' : 'none'}
          stroke="var(--rating-star)"
          strokeWidth="2"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
      <span className="ml-1 text-sm text-text-secondary font-medium">{rating.toFixed(1)}/10</span>
    </div>
  );
}

function formatRuntime(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

export default function MovieModal() {
  const { currentMovie, isModalOpen, closeMovie, openMovie } = useMovieContext();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') closeMovie();
  }, [closeMovie]);

  useEffect(() => {
    if (isModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isModalOpen, handleKeyDown]);

  if (!isModalOpen || !currentMovie) return null;

  const movie = currentMovie;
  const year = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
  const backdropUrl = movie.backdrop_path
    ? `${TMDB_IMAGE_BASE}/w1280${movie.backdrop_path}`
    : null;
  const posterUrl = movie.poster_path
    ? `${TMDB_IMAGE_BASE}/w500${movie.poster_path}`
    : null;
  const director = movie.crew?.find(c => c.job === 'Director');

  const handleSimilarClick = (m: Movie) => {
    openMovie(m);
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-bg-overlay backdrop-blur-sm"
        onClick={closeMovie}
      />

      {/* Modal container */}
      <div className="absolute inset-0 overflow-y-auto">
        <div className="min-h-full flex items-start justify-center p-4 sm:p-6 md:p-10">
          <div className="relative w-full max-w-4xl bg-bg-modal rounded-2xl overflow-hidden shadow-lg slide-up">
            {/* Close button */}
            <button
              onClick={closeMovie}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-sm"
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Backdrop image */}
            {backdropUrl && (
              <div className="relative w-full aspect-[21/9] overflow-hidden">
                <img
                  src={backdropUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bg-modal via-bg-modal/30 to-transparent" />
              </div>
            )}

            {/* Content */}
            <div className={`px-6 sm:px-8 pb-8 ${backdropUrl ? '-mt-20 relative' : 'pt-14'}`}>
              <div className="flex flex-col md:flex-row gap-6">
                {/* Poster (desktop) */}
                {posterUrl && (
                  <div className="hidden md:block flex-shrink-0 w-48 -mt-16">
                    <div className="aspect-[2/3] rounded-lg overflow-hidden shadow-lg border-2 border-bg-modal">
                      <img src={posterUrl} alt={movie.title} className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">
                    {movie.title}
                  </h2>

                  {/* Meta line */}
                  <div className="flex flex-wrap items-center gap-3 mb-4 text-sm text-text-secondary">
                    {year && <span>{year}</span>}
                    {movie.runtime && movie.runtime > 0 && (
                      <>
                        <span className="text-text-tertiary">|</span>
                        <span>{formatRuntime(movie.runtime)}</span>
                      </>
                    )}
                    {movie.original_language && (
                      <>
                        <span className="text-text-tertiary">|</span>
                        <span className="uppercase">{movie.original_language}</span>
                      </>
                    )}
                    {movie.vote_average !== undefined && movie.vote_average > 0 && (
                      <>
                        <span className="text-text-tertiary">|</span>
                        <StarRating rating={movie.vote_average} />
                      </>
                    )}
                    {movie.vote_count !== undefined && movie.vote_count > 0 && (
                      <span className="text-xs text-text-tertiary">
                        ({movie.vote_count.toLocaleString()} votes)
                      </span>
                    )}
                  </div>

                  {/* Genres */}
                  {movie.genres && movie.genres.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {movie.genres.map(g => (
                        <span key={g} className="px-3 py-1 rounded-full text-sm bg-genre-bg text-genre-text font-medium">
                          {g}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Tagline */}
                  {movie.tagline && (
                    <p className="text-text-secondary italic mb-3 text-sm">
                      &ldquo;{movie.tagline}&rdquo;
                    </p>
                  )}

                  {/* Overview */}
                  {movie.overview && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-2">Synopsis</h3>
                      <p className="text-text-secondary leading-relaxed">
                        {movie.overview}
                      </p>
                    </div>
                  )}

                  {/* Director */}
                  {director && (
                    <div className="mb-4">
                      <span className="text-sm text-text-tertiary">Directed by </span>
                      <span className="text-sm font-medium text-text-primary">{director.name}</span>
                    </div>
                  )}

                  {/* Cast */}
                  {movie.cast && movie.cast.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-3">Cast</h3>
                      <div className="flex gap-4 overflow-x-auto genre-scroll pb-2">
                        {movie.cast.map((person, i) => (
                          <div key={i} className="flex-shrink-0 text-center w-20">
                            <div className="w-16 h-16 rounded-full overflow-hidden bg-bg-tertiary mx-auto mb-1">
                              {person.profile_path ? (
                                <img
                                  src={`${TMDB_IMAGE_BASE}/w185${person.profile_path}`}
                                  alt={person.name}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-text-tertiary text-lg">
                                  {person.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <p className="text-xs font-medium text-text-primary line-clamp-1">{person.name}</p>
                            <p className="text-[10px] text-text-tertiary line-clamp-1">{person.character}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Keywords */}
                  {movie.keywords && movie.keywords.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-2">Keywords</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {movie.keywords.slice(0, 10).map(kw => (
                          <span key={kw} className="px-2 py-0.5 text-xs rounded bg-bg-tertiary text-text-secondary">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Similar movies */}
                  <SimilarMovies movieId={movie.id} onMovieClick={handleSimilarClick} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
