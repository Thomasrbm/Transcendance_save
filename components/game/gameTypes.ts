export type Pong3DProps = {
  paddle1Color: string
  paddle2Color: string
  mopStyle: "classic" | "red" | "neon"
}

export type GameState = {
  score: { player1: number; player2: number }
  winner: string | null
  countdown: number | null
  isPaused: boolean
}

export type GameRefs = {
  winner: React.MutableRefObject<string | null>
  isPaused: React.MutableRefObject<boolean>
}