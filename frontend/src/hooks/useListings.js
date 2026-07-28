import { useState, useEffect } from 'react';
import { fetchApi } from '../services/api';

export function useListings(initialFilters = {}) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);

  useEffect(() => {
    loadListings();
  }, [filters]);

  async function loadListings() {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams(filters).toString();
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

  return { listings, loading, error, setFilters, refresh: loadListings, createListing };
}
