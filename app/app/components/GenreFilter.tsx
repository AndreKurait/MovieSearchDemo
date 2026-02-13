'use client';

import { useSearchContext } from '@/app/context/SearchContext';

export default function GenreFilter() {
  const { genres, selectedGenres, toggleGenre, clearGenres } = useSearchContext();

  if (genres.length === 0) return null;

  return (
    <div className="w-full overflow-hidden">
      <div className="flex items-center gap-2 overflow-x-auto genre-scroll pb-1">
        {/* "All" pill */}
        <button
          onClick={clearGenres}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            selectedGenres.length === 0
              ? 'bg-genre-bg-active text-genre-text-active'
              : 'bg-genre-bg text-genre-text hover:bg-bg-tertiary'
          }`}
        >
          All
        </button>

        {genres.map(({ key, doc_count }) => (
          <button
            key={key}
            onClick={() => toggleGenre(key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              selectedGenres.includes(key)
                ? 'bg-genre-bg-active text-genre-text-active'
                : 'bg-genre-bg text-genre-text hover:bg-bg-tertiary'
            }`}
          >
            {key}
            <span className="ml-1.5 text-xs opacity-70">{doc_count.toLocaleString()}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
