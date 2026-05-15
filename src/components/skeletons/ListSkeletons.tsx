import { Skeleton } from "@/components/ui/skeleton";

/** Grid of item cards (Market / Jeera Box) */
export const ItemGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-2 gap-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-card rounded-3xl border border-border/40 overflow-hidden shadow-soft">
        <Skeleton className="aspect-[4/3] w-full rounded-none" />
        <div className="p-3 space-y-2">
          <Skeleton className="h-3 w-3/4 rounded-full" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-2.5 w-1/3 rounded-full" />
            <Skeleton className="h-6 w-6 rounded-full" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

/** Vertical list rows (Chats / Neighbors) */
export const ListRowsSkeleton = ({ count = 5 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-card rounded-3xl border border-border/40 p-4 flex items-center gap-3 shadow-soft">
        <Skeleton className="w-12 h-12 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-2/5 rounded-full" />
          <Skeleton className="h-2.5 w-3/5 rounded-full" />
        </div>
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
    ))}
  </div>
);

/** News-card skeleton */
export const NewsListSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-card rounded-3xl border border-border/40 p-4 space-y-3 shadow-soft">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-3.5 rounded-full" />
          <Skeleton className="h-2.5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-3 w-full rounded-full" />
        <Skeleton className="h-3 w-4/5 rounded-full" />
      </div>
    ))}
  </div>
);

/** Search results skeleton */
export const SearchResultsSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-card rounded-2xl border border-border/40 p-3 flex items-center gap-3 shadow-soft">
        <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-1/2 rounded-full" />
          <Skeleton className="h-2.5 w-1/3 rounded-full" />
        </div>
      </div>
    ))}
  </div>
);
