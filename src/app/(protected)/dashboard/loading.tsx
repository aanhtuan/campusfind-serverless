export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Banner Skeleton */}
      <div className="h-44 w-full rounded-3xl bg-muted/70 p-8 shadow-xs animate-pulse" />

      {/* Profile Skeleton */}
      <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-xs animate-pulse sm:p-8">
        <div className="h-5 w-48 rounded-lg bg-muted" />
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <div className="h-20 rounded-2xl bg-muted" />
          <div className="h-20 rounded-2xl bg-muted" />
          <div className="h-20 rounded-2xl bg-muted" />
        </div>
      </div>

      {/* Action Grid Skeleton */}
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <div className="h-48 rounded-3xl border border-border bg-card p-6 shadow-xs animate-pulse" />
        <div className="h-48 rounded-3xl border border-border bg-card p-6 shadow-xs animate-pulse" />
      </div>
    </main>
  );
}
