import { useState, useEffect } from 'react';
import { fetchApi } from '../services/api';

export function useListings(activeFilters = {}) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const filtersKey = JSON.stringify(activeFilters);

  useEffect(() => {
    loadListings();
  }, [filtersKey]);

  async function loadListings() {
    try {
      setLoading(true);
      const cleanFilters = {};
      Object.keys(activeFilters).forEach(key => {
        if (activeFilters[key]) cleanFilters[key] = activeFilters[key];
      });
      const queryParams = new URLSearchParams(cleanFilters).toString();
      const res = await fetchApi(`/listings?${queryParams}`);
      if (res.success) {
        setListings(res.data.listings || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function createListing(data) {
    const res = await fetchApi('/listings', {
      method: 'POST',
      body: data
    });
    if (res.success) {
      loadListings();
    }
    return res;
  }

  return { listings, loading, error, refresh: loadListings, createListing };
}

