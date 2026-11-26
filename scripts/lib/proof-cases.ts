// CI runs the two halves on separate runners. Local commands run every case.
export function proofCases<T>(cases: T[]): T[] {
  const half = process.env.PROOF_HALF;
  if (!half) return cases;
  if (half !== '1' && half !== '2') throw new Error(`Invalid PROOF_HALF: ${half}`);
  return cases.filter((_, index) => index % 2 === Number(half) - 1);
}
