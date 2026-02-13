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
  semanticRatio: number;
  ratingMin: number;
  page: number;
  hasMore: boolean;
  elserAvailable: boolean;
  searchMode: 'keyword' | 'hybrid' | 'semantic';
}

interface SearchContextType extends SearchState {
  setQuery: (q: string) => void;
  setSemanticRatio: (r: number) => void;
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
    semanticRatio: 0,
    ratingMin: 0,
    page: 1,
    hasMore: false,
    elserAvailable: false,
    searchMode: 'keyword',
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const pageSize = 24;

  // Determine search mode label
  const getSearchMode = (ratio: number): 'keyword' | 'hybrid' | 'semantic' => {
    if (ratio === 0) return 'keyword';
    if (ratio >= 1) return 'semantic';
    return 'hybrid';
  };

  const doSearch = useCallback(async (
    query: string,
    semanticRatio: number,
    selectedGenres: string[],
    ratingMin: number,
    page: number,
    append: boolean
  ) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState(prev => ({ ...prev, loading: true }));

    try {
      const params = new URLSearchParams();
      params.set('q', query);
      params.set('semanticRatio', semanticRatio.toString());
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
        searchMode: getSearchMode(semanticRatio),
      }));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('Search error:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const performSearch = useCallback((queryOverride?: string) => {
    const q = queryOverride ?? state.query;
    doSearch(q, state.semanticRatio, state.selectedGenres, state.ratingMin, 1, false);
  }, [state.query, state.semanticRatio, state.selectedGenres, state.ratingMin, doSearch]);

  const setQuery = useCallback((q: string) => {
    setState(prev => ({ ...prev, query: q, page: 1 }));
  }, []);

  const setSemanticRatio = useCallback((r: number) => {
    setState(prev => ({ ...prev, semanticRatio: r, page: 1 }));
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
      doSearch(state.query, state.semanticRatio, state.selectedGenres, state.ratingMin, nextPage, true);
    }
  }, [state, doSearch]);

  // Check ELSER availability on mount
  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(data => {
        setState(prev => ({ ...prev, elserAvailable: data.elserAvailable || false }));
      })
      .catch(() => {});
  }, []);

  // Auto-search when filters or semantic ratio changes
  useEffect(() => {
    doSearch(state.query, state.semanticRatio, state.selectedGenres, state.ratingMin, 1, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.semanticRatio, state.selectedGenres, state.ratingMin]);

  return (
    <SearchContext.Provider value={{
      ...state,
      setQuery,
      setSemanticRatio,
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
