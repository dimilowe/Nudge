export type TrafficSplit = { a: number; b: number; c: number };

/** Stable weighted assignment, salted per experiment. No browser fingerprinting. */
export function assignExperimentVariant(
  experimentId: string,
  visitorKey: string,
  split: TrafficSplit,
): number {
  const key = `${experimentId}:${visitorKey}`;
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const bucket = ((hash >>> 0) % 10000) / 100;
  return bucket < split.a ? 0 : bucket < split.a + split.b ? 1 : 2;
}

type Session = { id: string; fingerprint: string | null };

export function countExperimentVisitors(sessions: Session[]) {
  return new Set(sessions.map((session) => session.fingerprint || session.id)).size;
}

export function summarizeExperimentVariant(
  sessions: Session[],
  convertedSessionIds: Set<string>,
) {
  const visitors = countExperimentVisitors(sessions);
  const conversions = countExperimentVisitors(
    sessions.filter((session) => convertedSessionIds.has(session.id)),
  );
  return {
    visitors,
    conversions,
    conversionRate: visitors > 0 ? (conversions / visitors) * 100 : 0,
  };
}
