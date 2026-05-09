import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <section className="grid gap-4 xl:grid-cols-12">
        <div className="relative min-h-[18rem] overflow-clip rounded-3xl border bg-card p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] lg:col-span-5 dark:shadow-[0_18px_70px_rgba(0,0,0,0.35)]">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-12 w-44" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
            <Skeleton className="h-12 w-12 rounded-2xl" />
          </div>
          <div className="mt-16 grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border bg-background/70 p-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-2 h-4 w-28" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:col-span-7">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="relative overflow-clip rounded-2xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <Skeleton className="mt-2 h-8 w-24" />
              <Skeleton className="mt-2 h-3 w-32" />
              <Skeleton className="mt-3 h-9 w-full" />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border bg-card/75 p-5">
        <div className="mb-5 space-y-2">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card p-5">
              <div className="mb-5 space-y-1">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="flex items-center gap-6">
                <Skeleton className="h-36 w-36 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2.5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-2.5 w-2.5 rounded-full" />
                        <Skeleton className="h-3 w-28" />
                      </div>
                      <Skeleton className="h-3 w-10" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border bg-card/75 p-5">
        <div className="mb-5 space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <div className="mt-3.5 grid grid-cols-2 gap-3">
                {Array.from({ length: 2 }).map((_, j) => (
                  <div key={j} className="space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-1.5 w-full rounded-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </div>
              <Skeleton className="mt-4 h-7 w-20 rounded-lg" />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border bg-card/75 p-5">
        <div className="mb-5 space-y-2">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="space-y-4">
          <div className="space-y-2 rounded-2xl border bg-card p-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 flex-1 rounded-md" />
              <Skeleton className="h-8 w-32 rounded-md" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-8 w-24 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="h-8 w-22 rounded-md" />
              <Skeleton className="h-8 w-16 rounded-md" />
            </div>
          </div>
          <div className="rounded-xl border bg-card">
            <div className="overflow-x-auto">
              <div className="min-w-[960px]">
                <div className="flex items-center gap-4 border-b px-4 py-2.5">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-3 w-20 flex-1" />
                  ))}
                </div>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-4 border-b px-4 py-3 last:border-b-0">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <Skeleton key={j} className="h-3.5 w-20 flex-1" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
