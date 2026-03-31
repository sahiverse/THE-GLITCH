
export interface TestCase {
  id: number;
  description: string;
  passed: boolean;
}

export interface ChatMessage {
  id: string;
  user: string;
  text: string;
  color: string;
  timestamp: Date;
}

export interface GameState {
  aliveCount: number;
  totalPlayers: number;
  maxPlayers: number;
  timeLeft: number;
  topic: string;
  round: number;
  totalRounds: number;
  meetingsLeft: number;
}
