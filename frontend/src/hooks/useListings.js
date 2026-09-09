import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchApi } from '../services/api';

export function useListings(activeFilters = {}) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [error, setError] = useState(null);

  const filtersKey = JSON.stringify(activeFilters);
  const nextCursorRef = useRef(null);

  // Carregamento inicial do primeiro lote (lote 1) com cursor fresco
  const loadInitialListings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const cleanFilters = { limit: 20 };
      Object.keys(activeFilters).forEach((key) => {
        if (activeFilters[key]) cleanFilters[key] = activeFilters[key];
      });

      const queryParams = new URLSearchParams(cleanFilters).toString();
      const res = await fetchApi(`/listings?${queryParams}`);

      if (res.success && res.data) {
        const items = res.data.listings || [];
        setListings(items);
        setHasMore(Boolean(res.data.hasMore));
        setNextCursor(res.data.nextCursor || null);
        nextCursorRef.current = res.data.nextCursor || null;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filtersKey]);

  useEffect(() => {
    loadInitialListings();
  }, [loadInitialListings]);

  // Carregamento incremental do próximo lote utilizando Paginação por Cursor
  const loadMore = async () => {
    const currentCursor = nextCursorRef.current;
    if (!currentCursor || loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      const cleanFilters = { cursor: currentCursor, limit: 20 };
      Object.keys(activeFilters).forEach((key) => {
        if (activeFilters[key]) cleanFilters[key] = activeFilters[key];
      });

      const queryParams = new URLSearchParams(cleanFilters).toString();
      const res = await fetchApi(`/listings?${queryParams}`);

      if (res.success && res.data) {
        const newItems = res.data.listings || [];

        setListings((prev) => {
          // Desduplicação estrita baseada em ID para evitar itens repetidos
          const seen = new Set(prev.map((item) => item.id));
          const uniqueNewItems = newItems.filter((item) => !seen.has(item.id));
          return [...prev, ...uniqueNewItems];
        });

        setHasMore(Boolean(res.data.hasMore));
        setNextCursor(res.data.nextCursor || null);
        nextCursorRef.current = res.data.nextCursor || null;
      }
    } catch (err) {
      console.error('[CURSOR PAGINATION ERROR]:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  async function createListing(data) {
    const res = await fetchApi('/listings', {
      method: 'POST',
      body: data
    });
    if (res.success) {
      loadInitialListings();
    }
    return res;
  }

  return { 
    listings, 
    loading, 
    loadingMore, 
    hasMore, 
    loadMore, 
    error, 
    refresh: loadInitialListings, 
    createListing 
  };
}
