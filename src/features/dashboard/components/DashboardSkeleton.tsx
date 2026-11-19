import { Card, Skeleton } from '@/components/ui';

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-56" />
      </div>

      <div className="h-44 rounded-3xl bg-hero/80 p-6 sm:p-7">
        <div className="flex items-center gap-6">
          <div className="size-28 shrink-0 rounded-full bg-white/10" />
          <div className="flex flex-1 flex-col gap-2.5">
            <Skeleton className="h-3 w-28 opacity-25" />
            <Skeleton className="h-6 w-64 opacity-25" />
            <Skeleton className="h-4 w-48 opacity-25" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="p-5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-7 w-16" />
            <Skeleton className="mt-2 h-3 w-28" />
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-7">
          <Card className="h-80 p-6">
            <Skeleton className="h-5 w-36" />
            <div className="mt-5 flex flex-col gap-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          </Card>
        </div>
        <div className="flex flex-col gap-5 lg:col-span-5">
          <Card className="h-64 p-6">
            <Skeleton className="h-5 w-32" />
            <div className="mt-5 flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-11 w-full rounded-xl" />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
