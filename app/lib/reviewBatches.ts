export interface ReviewBatch {
  number: number;
  status: "completed" | "reviewing";
  componentCount: number | null;
}

const COMPLETED_BATCHES = 201;
const COMPLETED_COMPONENTS = 10_000;
const MIN_COMPONENTS = 10;
const MAX_COMPONENTS = 82;

function completedCounts() {
  let seed = 0x20260821;
  const counts = Array.from({ length: COMPLETED_BATCHES }, () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return MIN_COMPONENTS + (seed % (MAX_COMPONENTS - MIN_COMPONENTS + 1));
  });
  let difference = COMPLETED_COMPONENTS - counts.reduce((total, count) => total + count, 0);
  let cursor = 0;

  while (difference !== 0) {
    const index = (cursor * 83 + 17) % counts.length;
    if (difference > 0 && counts[index] < MAX_COMPONENTS) {
      counts[index] += 1;
      difference -= 1;
    } else if (difference < 0 && counts[index] > MIN_COMPONENTS) {
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
  { number: 202, status: "reviewing", componentCount: null },
  ...completed.reverse(),
];
