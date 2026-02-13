'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Movie } from '@/lib/elasticsearch';

interface MovieContextType {
  currentMovie: Movie | null;
  isModalOpen: boolean;
  openMovie: (movie: Movie) => void;
  closeMovie: () => void;
}

const MovieContext = createContext<MovieContextType>({
  currentMovie: null,
  isModalOpen: false,
  openMovie: () => {},
  closeMovie: () => {},
});

export function MovieProvider({ children }: { children: React.ReactNode }) {
  const [currentMovie, setCurrentMovie] = useState<Movie | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openMovie = useCallback((movie: Movie) => {
    setCurrentMovie(movie);
    setIsModalOpen(true);
  }, []);

  const closeMovie = useCallback(() => {
    setIsModalOpen(false);
    // Delay clearing movie to allow close animation
    setTimeout(() => setCurrentMovie(null), 200);
  }, []);

  return (
    <MovieContext.Provider value={{ currentMovie, isModalOpen, openMovie, closeMovie }}>
      {children}
    </MovieContext.Provider>
  );
}

export function useMovieContext() {
  return useContext(MovieContext);
}
