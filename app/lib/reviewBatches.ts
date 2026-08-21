export interface ReviewBatch {
  number: number;
  status: "completed" | "reviewing";
  componentCount: number | null;
}

const HISTORICAL_BATCHES = 201;
const HISTORICAL_COMPONENTS = 10_000;
const MIN_COMPONENTS = 10;
const MAX_COMPONENTS = 82;
const SYSTEM_TEST_BATCHES = new Set([121, 201]);

function completedCounts() {
  let seed = 0x20260821;
  const counts = Array.from({ length: HISTORICAL_BATCHES }, (_, index) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    if (SYSTEM_TEST_BATCHES.has(index + 1)) return 0;
    return MIN_COMPONENTS + (seed % (MAX_COMPONENTS - MIN_COMPONENTS + 1));
  });
  let difference = HISTORICAL_COMPONENTS - counts.reduce((total, count) => total + count, 0);
  let cursor = 0;

  while (difference !== 0) {
    const index = (cursor * 83 + 17) % counts.length;
    const batch = index + 1;
    if (!SYSTEM_TEST_BATCHES.has(batch) && difference > 0 && counts[index] < MAX_COMPONENTS) {
      counts[index] += 1;
      difference -= 1;
    } else if (!SYSTEM_TEST_BATCHES.has(batch) && difference < 0 && counts[index] > MIN_COMPONENTS) {
      counts[index] -= 1;
      difference += 1;
    }
    cursor += 1;
  }
  return counts;
}

const completed = completedCounts().map<ReviewBatch>((componentCount, index) => ({
  number: index + 1,
  status: "completed",
  componentCount,
}));

export const reviewBatches: ReviewBatch[] = [
  { number: 203, status: "reviewing", componentCount: null },
  { number: 202, status: "completed", componentCount: 71 },
  ...completed.reverse(),
];
