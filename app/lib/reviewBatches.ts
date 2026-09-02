export interface ReviewBatch {
  number: number;
  variant?: "A" | "B" | "C";
  purpose?: "system-test";
  status: "completed" | "reviewing";
  componentCount: number | null;
  cumulativeComponentCount: number;
  cumulativeComponentCountPending: boolean;
}

type ReviewBatchInput = Omit<ReviewBatch, "cumulativeComponentCount" | "cumulativeComponentCountPending">;

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

const completed = completedCounts().map<ReviewBatchInput>((componentCount, index) => ({
  number: index + 1,
  purpose: SYSTEM_TEST_BATCHES.has(index + 1) ? "system-test" : undefined,
  status: "completed",
  componentCount,
}));

const ascendingBatches: ReviewBatchInput[] = [
  ...completed,
  { number: 202, status: "completed", componentCount: 71 },
  { number: 203, status: "completed", componentCount: 97 },
  { number: 204, variant: "A", status: "completed", componentCount: 90 },
  { number: 204, variant: "B", purpose: "system-test", status: "completed", componentCount: 0 },
  { number: 204, variant: "C", purpose: "system-test", status: "completed", componentCount: 0 },
  { number: 205, status: "completed", componentCount: 81 },
  { number: 206, status: "completed", componentCount: 37 },
  { number: 207, status: "completed", componentCount: null },
  { number: 208, status: "completed", componentCount: null },
  { number: 209, status: "completed", componentCount: null },
  { number: 210, status: "completed", componentCount: null },
  { number: 211, status: "reviewing", componentCount: null },
  { number: 212, status: "reviewing", componentCount: null },
  { number: 213, status: "reviewing", componentCount: null },
  { number: 214, status: "reviewing", componentCount: null },
];

let cumulativeComponentCount = 0;
let cumulativeComponentCountPending = false;
export const reviewBatches: ReviewBatch[] = ascendingBatches.map((batch) => {
  cumulativeComponentCount += batch.componentCount ?? 0;
  cumulativeComponentCountPending ||= batch.status === "completed" && batch.componentCount === null;
  return { ...batch, cumulativeComponentCount, cumulativeComponentCountPending };
}).reverse();
