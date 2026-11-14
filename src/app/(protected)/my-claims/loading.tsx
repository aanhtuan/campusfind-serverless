export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Heading Skeleton */}
      <div className="mb-8 space-y-3">
        <div className="h-6 w-44 rounded-full bg-muted animate-pulse" />
        <div className="h-10 w-72 rounded-2xl bg-muted animate-pulse" />
        <div className="h-4 w-96 max-w-full rounded-lg bg-muted animate-pulse" />
      </div>

      {/* Tabs Skeleton */}
      <div className="mb-8 flex h-12 w-80 rounded-2xl border-2 border-border/80 bg-muted/30 animate-pulse" />

      {/* Claims Cards Skeleton */}
      <div className="grid gap-6 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex flex-col justify-between rounded-3xl border-2 border-border/80 bg-card p-6 shadow-2xs animate-pulse"
          >
            <div className="space-y-4">
              <div className="flex justify-between border-b border-border/60 pb-3">
                <div className="h-6 w-24 rounded-xl bg-muted" />
                <div className="h-6 w-28 rounded-xl bg-muted" />
              </div>
              <div className="h-6 w-4/5 rounded-lg bg-muted" />
              <div className="h-20 w-full rounded-2xl bg-muted/60" />
              <div className="flex gap-4">
                <div className="h-4 w-28 rounded-md bg-muted" />
                <div className="h-4 w-28 rounded-md bg-muted" />
              </div>
            </div>
            <div className="mt-6 border-t border-border/60 pt-4">
              <div className="h-10 w-full rounded-xl bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
