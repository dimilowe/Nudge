export const SCROLL_DEPTH_MILESTONES = [25, 50, 75, 90] as const;

export function calculateScrollDepth(
  scrollTop: number,
  scrollHeight: number,
  viewportHeight: number,
): number {
  const scrollableHeight = Math.max(0, scrollHeight - viewportHeight);
  if (scrollableHeight === 0 || !Number.isFinite(scrollTop)) return 0;

  return Math.min(100, Math.max(0, Math.round((scrollTop / scrollableHeight) * 100)));
}

export function getCrossedScrollMilestones(previousDepth: number, currentDepth: number): number[] {
  return SCROLL_DEPTH_MILESTONES.filter(
    (milestone) => previousDepth < milestone && currentDepth >= milestone,
  );
}
