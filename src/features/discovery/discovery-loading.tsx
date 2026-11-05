export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header skeleton */}
      <div className="mb-8 space-y-3">
        <div className="h-6 w-32 rounded-full bg-muted animate-pulse" />
        <div className="h-10 w-64 rounded-2xl bg-muted animate-pulse" />
        <div className="h-5 w-96 rounded-xl bg-muted animate-pulse" />
      </div>

      {/* Filter box skeleton */}
      <div className="mb-8 h-48 rounded-3xl border border-border bg-card p-6 shadow-xs animate-pulse">
        <div className="h-11 w-full rounded-xl bg-muted" />
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="h-11 rounded-xl bg-muted" />
          <div className="h-11 rounded-xl bg-muted" />
          <div className="h-11 rounded-xl bg-muted" />
        </div>
      </div>

      {/* Grid skeleton */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-xs animate-pulse"
          >
            <div className="h-32 w-full rounded-xl bg-muted" />
            <div className="mt-4 h-6 w-3/4 rounded-lg bg-muted" />
            <div className="mt-3 space-y-2">
              <div className="h-4 w-1/2 rounded-md bg-muted" />
              <div className="h-4 w-2/3 rounded-md bg-muted" />
            </div>
            <div className="mt-5 h-10 w-full rounded-xl bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
