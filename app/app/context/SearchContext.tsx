'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { Movie } from '@/lib/elasticsearch';

interface GenreBucket {
  key: string;
  doc_count: number;
}

interface SearchState {
  query: string;
  movies: Movie[];
  total: number;
  latency: number;
  loading: boolean;
  genres: GenreBucket[];
  selectedGenres: string[];
  ratingMin: number;
  page: number;
  hasMore: boolean;
}

interface SearchContextType extends SearchState {
  setQuery: (q: string) => void;
  toggleGenre: (genre: string) => void;
  clearGenres: () => void;
  setRatingMin: (r: number) => void;
  loadMore: () => void;
  performSearch: (q?: string) => void;
}

const SearchContext = createContext<SearchContextType | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SearchState>({
    query: '',
    movies: [],
    total: 0,
    latency: 0,
    loading: false,
    genres: [],
    selectedGenres: [],
    ratingMin: 0,
    page: 1,
    hasMore: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const pageSize = 24;

  const doSearch = useCallback(async (
    query: string,
    selectedGenres: string[],
    ratingMin: number,
    page: number,
    append: boolean
  ) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState(prev => ({ ...prev, loading: true }));

    try {
      const params = new URLSearchParams();
      params.set('q', query);
      params.set('page', page.toString());
      params.set('pageSize', pageSize.toString());
      if (selectedGenres.length > 0) params.set('genres', selectedGenres.join(','));
      if (ratingMin > 0) params.set('ratingMin', ratingMin.toString());

      const response = await fetch(`/api/search?${params.toString()}`, {
        signal: controller.signal,
      });

      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();

      setState(prev => ({
        ...prev,
        movies: append ? [...prev.movies, ...data.movies] : data.movies,
        total: data.total,
        latency: data.latency,
        genres: data.genres || prev.genres,
        loading: false,
        page,
        hasMore: (append ? prev.movies.length + data.movies.length : data.movies.length) < data.total,
      }));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('Search error:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const performSearch = useCallback((queryOverride?: string) => {
    const q = queryOverride ?? state.query;
    doSearch(q, state.selectedGenres, state.ratingMin, 1, false);
  }, [state.query, state.selectedGenres, state.ratingMin, doSearch]);

  const setQuery = useCallback((q: string) => {
    setState(prev => ({ ...prev, query: q, page: 1 }));
  }, []);

  const toggleGenre = useCallback((genre: string) => {
    setState(prev => {
      const selected = prev.selectedGenres.includes(genre)
        ? prev.selectedGenres.filter(g => g !== genre)
        : [...prev.selectedGenres, genre];
      return { ...prev, selectedGenres: selected, page: 1 };
    });
  }, []);

  const clearGenres = useCallback(() => {
    setState(prev => ({ ...prev, selectedGenres: [], page: 1 }));
  }, []);

  const setRatingMin = useCallback((r: number) => {
    setState(prev => ({ ...prev, ratingMin: r, page: 1 }));
  }, []);

  const loadMore = useCallback(() => {
    if (!state.loading && state.hasMore) {
      const nextPage = state.page + 1;
      doSearch(state.query, state.selectedGenres, state.ratingMin, nextPage, true);
    }
  }, [state, doSearch]);

  // Auto-search when filters change
  useEffect(() => {
    doSearch(state.query, state.selectedGenres, state.ratingMin, 1, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedGenres, state.ratingMin]);

  return (
    <SearchContext.Provider value={{
      ...state,
      setQuery,
      toggleGenre,
      clearGenres,
      setRatingMin,
      loadMore,
      performSearch,
    }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearchContext() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearchContext must be used within SearchProvider');
  return ctx;
}
