export function calculateBingoScore(correctCount: number): number {
  return Math.max(0, Math.min(correctCount * 10, 100));
}

export function calculateQuizScore(correctCount: number): number {
  return Math.max(0, Math.min(correctCount * 10, 100));
}

export function calculateStoryScore(results: boolean[]): number {
  let score = 0;
  for (const correct of results) {
    if (correct) score += 50;
  }
  return Math.max(0, Math.min(score, 100));
}

export function calculateEliminationScore(correctCount: number): number {
  return Math.max(0, Math.min(correctCount * 20, 100));
}
