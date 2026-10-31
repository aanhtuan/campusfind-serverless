import type { ItemPhoto } from "../reports/types";

type AccessOptions = {
  verify: () => Promise<string | null>;
  load: () => Promise<ItemPhoto[]>;
  onPending: () => void;
  onAnonymous: () => void;
  onReady: (userId: string, photos: ItemPhoto[]) => void;
  onError: () => void;
};
// This only controls the public page's photo UI. The SDK's verified JWT and
// Storage/database RLS enforce authorization for every request.
export function createPhotoAccess(options: AccessOptions) {
  let generation = 0;
  let disposed = false;
  const current = (ticket: number) => !disposed && ticket === generation;
  return {
    async check() {
      if (disposed) return;
      const ticket = ++generation; options.onPending();
      try {
        const userId = await options.verify();
        if (!current(ticket)) return;
        if (!userId) { options.onAnonymous(); return; }
        const photos = await options.load();
        if (current(ticket)) options.onReady(userId, photos);
      } catch { if (current(ticket)) options.onError(); }
    },
    suspend() { if (!disposed) { generation++; options.onPending(); } },
    signOut() { if (!disposed) { generation++; options.onAnonymous(); } },
    dispose() { disposed = true; generation++; },
  };
}
