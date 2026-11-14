export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back button skeleton */}
      <div className="mb-6 h-9 w-48 rounded-xl bg-muted animate-pulse" />

      {/* Main card skeleton */}
      <div className="rounded-3xl border-2 border-border/80 bg-card p-6 shadow-2xs sm:p-8 space-y-6 animate-pulse">
        <div className="flex justify-between border-b border-border/60 pb-4">
          <div className="flex gap-2">
            <div className="h-6 w-24 rounded-xl bg-muted" />
            <div className="h-6 w-24 rounded-xl bg-muted" />
          </div>
          <div className="h-6 w-32 rounded-xl bg-muted" />
        </div>

        <div className="h-9 w-2/3 rounded-xl bg-muted" />

        <div className="flex gap-4">
          <div className="h-4 w-32 rounded-md bg-muted" />
          <div className="h-4 w-32 rounded-md bg-muted" />
        </div>

        <div className="h-28 w-full rounded-2xl bg-muted/60" />

        <div className="h-32 w-full rounded-2xl bg-muted/40" />

        <div className="flex gap-3 pt-2">
          <div className="h-11 w-36 rounded-xl bg-muted" />
          <div className="h-11 w-36 rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}
