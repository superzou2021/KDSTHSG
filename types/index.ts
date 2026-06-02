export type GameKey = "bingo" | "quiz" | "story" | "elimination";

export type Player = {
  id: string;
  name: string;
  phone: string;
  office: string;
  team: string;
  totalScore: number;
  completedGames: GameKey[];
  finalSubmitted: boolean;
  created: string;
  updated: string;
  finalCompletedAt?: string;
};

export type Game = {
  id: string;
  key: GameKey;
  name: string;
  maxScore: number;
  isOpen: boolean;
  order: number;
  bingoScored?: boolean;
};

export type Question = {
  id: string;
  gameKey: GameKey;
  type: "word" | "single" | "boolean" | "story";
  title: string;
  options?: string[];
  correctAnswer: string | string[];
  score: number;
  order: number;
  isActive: boolean;
};

export type GameResult = {
  id: string;
  player: string;
  gameKey: GameKey;
  answers: Record<string, unknown>;
  score: number;
  maxScore: number;
  completedAt: string;
  pendingBingoScore?: boolean;
};

export type RankingItem = {
  rank: number;
  playerId: string;
  name: string;
  office: string;
  team: string;
  totalScore: number;
};

export type OfficeAverageItem = {
  rank: number;
  office: string;
  averageScore: number;
  playerCount: number;
};

export type OfficeTop3Group = {
  office: string;
  players: RankingItem[];
};

export type AppState = {
  players: Player[];
  gameResults: GameResult[];
  games: Game[];
  questions: Question[];
};
