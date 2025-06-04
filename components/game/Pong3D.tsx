// Pong3D.tsx
import { useEffect, useRef, useState } from "react";
import { Engine, Scene, Color3, Vector3 } from "@babylonjs/core";
import { setupGame } from "./gameSetup";
import { initgamePhysic } from "./gamePhysic";
import { GameUI } from "./GameUI";
import { Pong3DProps, GameState, GameRefs } from "./gameTypes";

type ExtendedPong3DProps = Pong3DProps & {
  resetCamFlag: number;
};

export default function Pong3D({
  paddle1Color,
  paddle2Color,
  mopStyle,
  resetCamFlag,
}: ExtendedPong3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState<GameState["score"]>({ player1: 0, player2: 0 });
  const [winner, setWinner] = useState<GameState["winner"]>(null);
  const [countdown, setCountdown] = useState<GameState["countdown"]>(null);
  const [isPaused, setIsPaused] = useState<GameState["isPaused"]>(false);

  // Réfs pour winner & isPaused 
  const winnerRef = useRef<string | null>(winner);
  const isPausedRef = useRef<boolean>(isPaused);
  useEffect(() => { winnerRef.current = winner; }, [winner]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  // Réf pour conserver la caméra (récup depuis setupGame)
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // 1) Création de l’engine et de la scène ( gere la creation du rendu 3d)
    const engine = new Engine(canvasRef.current, true);
    const scene = new Scene(engine);
    scene.clearColor = new Color3(1, 1, 1);

    // 2) Initialiser la partie, setupGame retourne l’objet camera et cree les couleur de pads etc
    const gameObjects = setupGame(scene, mopStyle, paddle1Color, paddle2Color);
    cameraRef.current = gameObjects.camera;

    // 3) Physique du du jeu
    const cleanupPhysic = initgamePhysic(
      scene,
      gameObjects,
      { score, winner, countdown, isPaused },
      { winner: winnerRef, isPaused: isPausedRef },
      setScore,
      setWinner,
      setCountdown,
      setIsPaused
    );

    // 4) Boucle de rendu
    engine.runRenderLoop(() => scene.render());
    window.addEventListener("resize", () => engine.resize());

    // 5) Nettoyage au démontage complet de Pong3D
    return () => {
      cleanupPhysic();
      engine.dispose();
    };
  }, [paddle1Color, paddle2Color, mopStyle]);

  // ──────────────────────────────────────────────────────────────────
  // 6) useEffect qui n’agit QUE sur resetCamFlag
  // ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!cameraRef.current) return;
    // Repositionne la caméra exactement comme dans gameSetup :
    cameraRef.current.alpha = 0;
    cameraRef.current.beta = Math.PI / 3.1;
    cameraRef.current.radius = 35;
    cameraRef.current.setTarget(Vector3.Zero());
  }, [resetCamFlag]);

  return (
    <div className="relative">
      <GameUI
        score={score}
        winner={winner}
        countdown={countdown}
        isPaused={isPaused}
        setIsPaused={setIsPaused}
      />
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
