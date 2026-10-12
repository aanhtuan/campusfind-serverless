type Options = {
  verify: () => Promise<string | null>;
  expectedUserId: string;
  onPending: () => void;
  onVerified: () => void;
  onSignedOut: () => void;
  onIdentityChanged: () => void;
};

// UI freshness only. Server getUser and database RLS remain authorization.
export function createSessionMonitor(options: Options) {
  let generation = 0;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const hide = () => { generation++; options.onPending(); };
  async function check() {
    if (disposed) return;
    hide();
    const current = generation;
    let identity: string | null = null;
    try { identity = await options.verify(); } catch { /* Fail closed without logging. */ }
    if (disposed || current !== generation) return;
    if (!identity) options.onSignedOut();
    else if (identity !== options.expectedUserId) options.onIdentityChanged();
    else options.onVerified();
  }
  return {
    check,
    suspend() { if (!disposed) hide(); },
    event(event: string) {
      if (disposed) return;
      if (event === "SIGNED_OUT") { hide(); options.onSignedOut(); }
      else if (event === "SIGNED_IN") {
        hide();
        clearTimeout(timer);
        // Do not await/call another Auth operation inside the SDK callback lock.
        timer = setTimeout(() => { void check(); }, 0);
      }
    },
    dispose() { disposed = true; generation++; clearTimeout(timer); },
  };
}
