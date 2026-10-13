let inMemoryVisitorId: string | undefined;

/** An anonymous random ID, not a device fingerprint or account identifier. */
export function getVisitorId(): string {
  if (inMemoryVisitorId) return inMemoryVisitorId;
  try {
    const saved = localStorage.getItem("nudg-visitor-id");
    if (saved && saved.length >= 8 && saved.length <= 200) {
      inMemoryVisitorId = saved;
      return saved;
    }
  } catch {
    // Private/storage-blocked browsers keep a consistent ID for this visit.
  }
  inMemoryVisitorId = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    localStorage.setItem("nudg-visitor-id", inMemoryVisitorId);
  } catch {
    // The page still works if persistence is blocked.
  }
  return inMemoryVisitorId;
}
