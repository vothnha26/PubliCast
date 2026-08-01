import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function CalendarSkeleton({ viewMode = 'WEEK' }) {
  if (viewMode === 'MONTH') {
    return (
      <div className="w-full h-full border border-border rounded-2xl bg-card p-4 shadow-sm flex flex-col gap-3">
        {/* Month Header Days */}
        <div className="grid grid-cols-7 gap-2 pb-2 border-b border-border">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-6 w-full rounded-lg bg-muted" />
          ))}
        </div>
        {/* Month Cells Grid */}
        <div className="grid grid-cols-7 grid-rows-5 gap-2 flex-1 min-h-[500px]">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="p-2 border border-border rounded-xl flex flex-col gap-2">
              <Skeleton className="h-4 w-6 rounded bg-muted" />
              {i % 3 === 0 && <Skeleton className="h-10 w-full rounded-lg bg-muted/80" />}
              {i % 5 === 1 && <Skeleton className="h-8 w-full rounded-lg bg-muted/60" />}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default WEEK / DAY View Skeleton
  return (
    <div className="w-full h-full border border-border rounded-2xl bg-card overflow-hidden shadow-sm flex flex-col">
      {/* Header Days Row */}
      <div className="flex border-b border-border bg-muted/50">
        <div className="w-20 shrink-0 p-3 border-r border-border">
          <Skeleton className="h-4 w-10 mx-auto rounded bg-muted" />
        </div>
        <div className="flex-1 grid grid-cols-7 divide-x divide-border">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="p-3 flex flex-col items-center gap-1.5">
              <Skeleton className="h-3 w-8 rounded bg-muted" />
              <Skeleton className="h-5 w-12 rounded-lg bg-muted" />
            </div>
          ))}
        </div>
      </div>

      {/* Grid Hour Rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {[...Array(6)].map((_, rIdx) => (
          <div key={rIdx} className="flex min-h-[90px]">
            {/* Time label */}
            <div className="w-20 shrink-0 p-3 border-r border-border bg-muted/30 flex justify-center items-start">
              <Skeleton className="h-3 w-10 rounded bg-muted" />
            </div>
            {/* 7 Columns */}
            <div className="flex-1 grid grid-cols-7 divide-x divide-border p-1.5 gap-1.5">
              {[...Array(7)].map((_, cIdx) => (
                <div key={cIdx} className="p-1 flex flex-col gap-1.5">
                  {(rIdx + cIdx) % 4 === 1 && (
                    <Skeleton className="h-14 w-full rounded-xl bg-muted/90 border border-border" />
                  )}
                  {(rIdx * 2 + cIdx) % 7 === 3 && (
                    <Skeleton className="h-10 w-full rounded-xl bg-muted/70 border border-border" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
