'use client';

import { useState, useCallback } from 'react';

interface Movie {
  id: string;
  title: string;
  tagline?: string;
  genres: string[];
  overview: string;
  release_date?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  _score?: number;
  _textScore?: number;
  _functionScore?: number;
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [latency, setLatency] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setMovies([]);
      setTotal(0);
      setLatency(0);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setMovies(data.movies || []);
      setTotal(data.total || 0);
      setLatency(data.latency || 0);
    } catch (error) {
      console.error('Search error:', error);
      setMovies([]);
      setTotal(0);
      setLatency(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
    performSearch(query);
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    // Reset hasSearched when user types to avoid showing "No movies found" while typing
    if (hasSearched) {
      setHasSearched(false);
    }
  };

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold mb-8 text-center">Movie Search</h1>
      
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-4">
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Search for movies..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {total > 0 && (
        <div className="mb-6">
          <div className="text-gray-600 mb-3">
            <p>Found {total.toLocaleString()} results in {latency}ms</p>
            {total > 10 && (
              <p className="text-sm">Showing top 10 results</p>
            )}
          </div>
          <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
            <p className="font-semibold mb-1">Ranking Factors:</p>
            <div className="flex flex-wrap gap-3">
              <span className="flex items-center gap-1">
                <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">Score</span>
                Combined text relevance + popularity factors
              </span>
              <span className="flex items-center gap-1">
                <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs">Text Match</span>
                Title (boosted) + Overview + Genres
              </span>
              <span className="flex items-center gap-1">
                <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs">Popularity</span>
                Vote count + Average rating
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6">
        {movies.map((movie) => (
          <div key={movie.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-2xl font-semibold">{movie.title}</h2>
              <div className="flex flex-wrap gap-2 items-center justify-end">
                {movie._score && (
                  <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded" title="Total Score">
                    Score: {movie._score.toFixed(1)}
                  </span>
                )}
                {movie._textScore !== undefined && (
                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded" title="Text Match Score">
                    Text: {movie._textScore.toFixed(1)}
                  </span>
                )}
                {movie.vote_count !== undefined && movie.vote_count > 0 && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded" title="Number of votes">
                    {movie.vote_count > 1000 ? `${(movie.vote_count / 1000).toFixed(1)}k` : movie.vote_count} votes
                  </span>
                )}
              </div>
            </div>
            
            <div className="text-gray-600 mb-2">
              {movie.release_date && <span>{new Date(movie.release_date).getFullYear()}</span>}
              {movie.vote_average && (
                <>
                  {movie.release_date && ' • '}
                  <span>⭐ {movie.vote_average.toFixed(1)}/10</span>
                </>
              )}
            </div>
            
            {movie.tagline && (
              <p className="text-gray-600 italic mb-3">&quot;{movie.tagline}&quot;</p>
            )}
            
            <div className="mb-3">
              {movie.genres.map((g: string) => (
                <span key={g} className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm mr-2 mb-2">
                  {g}
                </span>
              ))}
            </div>
            
            <p className="text-gray-700">{movie.overview}</p>
          </div>
        ))}
      </div>

      {movies.length === 0 && query && !loading && hasSearched && (
        <p className="text-center text-gray-500 mt-8">No movies found for &quot;{query}&quot;</p>
      )}
    </main>
  );
}
