export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Title skeleton */}
      <div className="mb-8 space-y-3">
        <div className="h-6 w-36 rounded-full bg-muted animate-pulse" />
        <div className="h-10 w-64 rounded-2xl bg-muted animate-pulse" />
        <div className="h-4 w-96 rounded-lg bg-muted animate-pulse" />
      </div>

      {/* Grid skeleton */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-xs animate-pulse"
          >
            <div className="flex justify-between">
              <div className="h-5 w-20 rounded-full bg-muted" />
              <div className="h-5 w-24 rounded-full bg-muted" />
            </div>
            <div className="mt-4 h-6 w-3/4 rounded-lg bg-muted" />
            <div className="mt-4 space-y-2">
              <div className="h-4 w-1/2 rounded-md bg-muted" />
              <div className="h-4 w-2/3 rounded-md bg-muted" />
            </div>
            <div className="mt-6 h-10 w-full rounded-xl bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
