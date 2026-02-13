'use client';

export default function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[2/3] rounded-lg skeleton mb-2" />
          <div className="h-4 skeleton rounded w-3/4 mb-1" />
          <div className="h-3 skeleton rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}
