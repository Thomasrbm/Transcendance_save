import { Vector3 } from "@babylonjs/core";
import { Sound, Color3 } from "@babylonjs/core";
import { GameState, GameRefs } from "./gameTypes";

const TOTAL_SPEED = 0.16;
const SPEED_INCREMENT = 1.009;
const MAX_ANGLE = Math.PI / 4;
const MINI_SPEED = 0.1;
const MINI_BOUND_X = 6;

export const initgamePhysic = (
  scene: any,
  gameObjects: any,
  gameState: GameState,
  gameRefs: GameRefs,
  setScore: (score: { player1: number; player2: number }) => void,
  setWinner: (winner: string | null) => void,
  setCountdown: (countdown: number | null) => void,
  setIsPaused: (isPaused: boolean) => void
) => {
  const { ball, paddle1, paddle2, miniPaddle, allHitSounds, ballMat, p1Mat, p2Mat } = gameObjects;
  let ballV = Vector3.Zero();
  let currentSpeed = TOTAL_SPEED;
  let scoreLocal = { player1: 0, player2: 0 };
  const keys = new Set<string>();
  let miniDir = 1;

  const serve = (loserSide: "player1" | "player2") => {
    currentSpeed = TOTAL_SPEED;
    const angle = (Math.random() * 2 - 1) * MAX_ANGLE;
    const vx = Math.sin(angle) * currentSpeed;
    const vz = Math.cos(angle) * currentSpeed * (loserSide === "player1" ? -1 : 1);
    ballV = new Vector3(vx, 0, vz);
  };

  const startCountdown = (duration: number, callback: () => void) => {
    setIsPaused(true);
    setCountdown(duration);
    let cnt = duration;
    const iv = setInterval(() => {
      cnt--;
      if (cnt > 0) {
        setCountdown(cnt);
      } else {
        clearInterval(iv);
        setCountdown(null);
        setIsPaused(false);
        callback();
      }
    }, 500);
  };

  const resetBall = (loser: "player1" | "player2") => {
    ball.position = Vector3.Zero();
    ballV = Vector3.Zero();
    const dirZ = loser === "player1" ? -1 : 1;
    startCountdown(3, () => serve(dirZ as any));
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (gameRefs.winner.current || gameRefs.isPaused.current) return;
    if (["w", "s", "ArrowUp", "ArrowDown"].includes(e.key)) {
      keys.add(e.key);
      e.preventDefault();
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    keys.delete(e.key);
  };

  const onGlobalKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsPaused(prev => !prev);
    }
  };

  window.addEventListener("keydown", onKeyDown, { passive: false });
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("keydown", onGlobalKeyDown);

  // Logique de jeu
  scene.onBeforeRenderObservable.add(() => {
    if (gameRefs.winner.current || gameRefs.isPaused.current) return;

    // Déplacement paddles
    if (keys.has("w")) paddle1.position.x = Math.max(-9, paddle1.position.x - 0.3);
    if (keys.has("s")) paddle1.position.x = Math.min(9, paddle1.position.x + 0.3);
    if (keys.has("ArrowUp")) paddle2.position.x = Math.max(-9, paddle2.position.x - 0.3);
    if (keys.has("ArrowDown")) paddle2.position.x = Math.min(9, paddle2.position.x + 0.3);

    // Mini-paddle - Vérifier que miniPaddle existe avant d'y accéder
    if (miniPaddle) {
      miniPaddle.position.x += MINI_SPEED * miniDir;
      if (miniPaddle.position.x > MINI_BOUND_X) {
        miniPaddle.position.x = MINI_BOUND_X;
        miniDir = -1;
      } else if (miniPaddle.position.x < -MINI_BOUND_X) {
        miniPaddle.position.x = -MINI_BOUND_X;
        miniDir = 1;
      }
    } else {
      console.error("miniPaddle n'est pas défini");
    }

    // Déplacement balle
    ball.position.addInPlace(ballV);

    // ==== CORRECTION DES COLLISIONS - NOUVELLE VERSION ====
    // Rebond murs latéraux
    if (ball.position.x > 10 || ball.position.x < -10) {
      const dirAfter = new Vector3(-ballV.x, 0, ballV.z).normalize();
      currentSpeed *= SPEED_INCREMENT;
      ballV = dirAfter.scale(currentSpeed);
      playRandomCollisionSound(allHitSounds);
    }

    // Rebonds avec paddles
    const PADDLE_HALF_WIDTH = 3;
    const MAX_BOUNCE_ANGLE = Math.PI / 3;

    // Collision paddle1
    if (ball.position.z < -19 && Math.abs(ball.position.x - paddle1.position.x) < PADDLE_HALF_WIDTH) {
      const relativeIntersectX = (ball.position.x - paddle1.position.x) / PADDLE_HALF_WIDTH;
      const bounceAngle = relativeIntersectX * MAX_BOUNCE_ANGLE;
      const dirX = Math.sin(bounceAngle);
      const dirZ = Math.cos(bounceAngle);
      const dirAfter = new Vector3(dirX, 0, dirZ).normalize();
      currentSpeed *= SPEED_INCREMENT;
      ballV = dirAfter.scale(currentSpeed);

      // Changement couleur balle si elle n'est pas noire (pour Neon)
      if (!ballMat.diffuseColor.equals(Color3.Black())) {
        ballMat.diffuseColor = p1Mat.diffuseColor.clone();
      }

      playRandomCollisionSound(allHitSounds);
    }

    // Collision paddle2
    if (ball.position.z > 19 && Math.abs(ball.position.x - paddle2.position.x) < PADDLE_HALF_WIDTH) {
      const relativeIntersectX = (ball.position.x - paddle2.position.x) / PADDLE_HALF_WIDTH;
      const bounceAngle = relativeIntersectX * MAX_BOUNCE_ANGLE;
      const dirX = Math.sin(bounceAngle);
      const dirZ = Math.cos(bounceAngle);
      const dirAfter = new Vector3(dirX, 0, -dirZ).normalize();
      currentSpeed *= SPEED_INCREMENT;
      ballV = dirAfter.scale(currentSpeed);

      // Changement couleur balle si elle n'est pas noire (pour Neon)
      if (!ballMat.diffuseColor.equals(Color3.Black())) {
        ballMat.diffuseColor = p2Mat.diffuseColor.clone();
      }

      playRandomCollisionSound(allHitSounds);
    }

    // Collision mini-paddle
    const MINI_PADDLE_HALF_WIDTH = 2;
    const MINI_PADDLE_HALF_DEPTH = 0.25;
    if (
      Math.abs(ball.position.z - miniPaddle.position.z) < MINI_PADDLE_HALF_DEPTH &&
      Math.abs(ball.position.x - miniPaddle.position.x) < MINI_PADDLE_HALF_WIDTH
    ) {
      const relativeX = (ball.position.x - miniPaddle.position.x) / MINI_PADDLE_HALF_WIDTH;
      const bounceAngle = relativeX * (Math.PI / 4);
      const dirX = Math.sin(bounceAngle);
      const dirZ = ballV.z > 0 ? -Math.cos(bounceAngle) : Math.cos(bounceAngle);
      const dirAfter = new Vector3(dirX, 0, dirZ).normalize();
      currentSpeed *= SPEED_INCREMENT;
      ballV = dirAfter.scale(currentSpeed);
      playRandomCollisionSound(allHitSounds);
    }

    // ==================================================

    // Gestion des scores
    handleScoring(ball, scoreLocal, setScore, setWinner, resetBall, gameRefs);
  });

  // Démarrage initial
  startCountdown(5, () => serve(Math.random() > 0.5 ? "player1" : "player2"));

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("keydown", onGlobalKeyDown);
  };
};

// Fonction de lecture de son
const playRandomCollisionSound = (sounds: Sound[]) => {
  const randomIndex = Math.floor(Math.random() * sounds.length);
  sounds[randomIndex].play();
};

// Fonction de scoring inchangée
const handleScoring = (
  ball: any,
  scoreLocal: { player1: number; player2: number },
  setScore: (score: { player1: number; player2: number }) => void,
  setWinner: (winner: string | null) => void,
  resetBall: (loser: "player1" | "player2") => void,
  gameRefs: GameRefs
) => {
  if (ball.position.z < -20) {
    scoreLocal.player2 += 1;
    setScore({ ...scoreLocal });
    if (scoreLocal.player2 >= 5) {
      setWinner("Joueur 2");
    } else {
      resetBall("player1");
    }
  }

  if (ball.position.z > 20) {
    scoreLocal.player1 += 1;
    setScore({ ...scoreLocal });
    if (scoreLocal.player1 >= 5) {
      setWinner("Joueur 1");
    } else {
      resetBall("player2");
    }
  }
};
