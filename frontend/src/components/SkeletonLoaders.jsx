import React from 'react';

export function ListingSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm animate-pulse space-y-3">
      <div className="w-full h-44 bg-slate-200 rounded-xl" />
      <div className="h-4 bg-slate-200 rounded w-3/4" />
      <div className="h-4 bg-slate-200 rounded w-1/2" />
      <div className="flex justify-between items-center pt-2">
        <div className="h-6 bg-slate-200 rounded w-1/3" />
        <div className="h-8 bg-slate-200 rounded-lg w-1/4" />
      </div>
    </div>
  );
}

export function MarketplaceSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <ListingSkeleton key={i} />
      ))}
    </div>
  );
}
