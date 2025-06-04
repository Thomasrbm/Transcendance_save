import {
  ArcRotateCamera,
  DirectionalLight,
  HemisphericLight,
  Vector3,
  MeshBuilder,
  Color3,
  StandardMaterial,
  Sound,
  GlowLayer,
} from "@babylonjs/core";

export const setupGame = (
  scene: Scene,
  mopStyle: "classic" | "red" | "neon",
  paddle1Color: string,
  paddle2Color: string
) => {
  // GlowLayer pour Neon
  if (mopStyle === "neon") {
    const glow = new GlowLayer("glow", scene);
    glow.intensity = 0.6; // Assure-toi que l'intensité du glow est bien appliquée
  }

  // Sons
  const allHitSounds: Sound[] = [
    new Sound("hit1", "/sounds/pong-1.mp3", scene, null, { volume: 0.5, autoplay: false }),
    // Ajoute d'autres sons si nécessaire
  ];

  // Caméra - ajustée pour les deux joueurs
  const camera = new ArcRotateCamera(
    "cam", 
    0,   // axe y  pour droite gauche
    Math.PI / 3.1, // x pour hauteur angle
    35, // dezoom si tu reduit
    Vector3.Zero(),
    scene);
  camera.attachControl(scene.getEngine().getRenderingCanvas(), true); // Permet de déplacer la caméra avec la souris
  camera.inputs.addMouseWheel(); // Permet le zoom avec la molette de la souris
  camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput"); // Désactive les déplacements via le clavier

  // Lumières
  const dir = new DirectionalLight("dir", new Vector3(1, -1, 0), scene); // Lumière directionnelle inclinée vers le bas
  dir.intensity = 0.5;
  const hemi = new HemisphericLight("hemi", Vector3.Up(), scene);
  hemi.intensity = 0.3;

  // Matériaux pour les paddles et la balle
  const p1Mat = new StandardMaterial("p1Mat", scene);
  p1Mat.diffuseColor = Color3.FromHexString(paddle1Color);

  const p2Mat = new StandardMaterial("p2Mat", scene);
  p2Mat.diffuseColor = Color3.FromHexString(paddle2Color);

  const ballMat = new StandardMaterial("ballMat", scene);
  ballMat.diffuseColor = Color3.Black(); // La balle reste noire par défaut

  // Table de jeu - couleur selon le mopStyle
  const groundMat = new StandardMaterial("groundMat", scene);
  
  // Sol plus sombre pour la map classique
  if (mopStyle === "classic") {
    groundMat.diffuseColor = Color3.FromHexString("#1A1A1A");  // Sol gris foncé pour "classic"
  } else if (mopStyle === "red") {
    groundMat.diffuseColor = Color3.FromHexString("#800020");  // Sol rouge pour "red"
  } else if (mopStyle === "neon") {
    // Sol de plusieurs couleurs fluorescentes pour "neon"
    const colors = [
      Color3.FromHexString("#FF00FF"), // Magenta
      Color3.FromHexString("#00FF00"), // Vert
      Color3.FromHexString("#FFFF00"), // Jaune
      Color3.FromHexString("#00FFFF"), // Cyan
      Color3.FromHexString("#FF0000"), // Rouge
      Color3.FromHexString("#0000FF")  // Bleu
    ];
    
    // Crée plusieurs bandes colorées sur le sol avec un effet lumineux
    const stripeHeight = 40 / colors.length;
    colors.forEach((color, index) => {
      const stripeMat = new StandardMaterial(`stripeMat${index}`, scene);
      stripeMat.diffuseColor = color;
      stripeMat.emissiveColor = color; // Couleur émissive pour l'effet glow
      stripeMat.specularColor = color;
      stripeMat.specularPower = 32;

      const stripe = MeshBuilder.CreateGround(`stripe${index}`, { width: 20, height: stripeHeight }, scene);
      stripe.material = stripeMat;
      stripe.position.y = -0.25;
      stripe.position.z = -20 + stripeHeight / 2 + index * stripeHeight; // Espacement des bandes
    });
  }

  const ground = MeshBuilder.CreateGround("ground", { width: 20, height: 40 }, scene);
  ground.material = groundMat;
  ground.position.y = -0.25;

  // Paddles
  const paddleOpts = { width: 6, height: 0.5, depth: 0.5 };
  const paddle1 = MeshBuilder.CreateBox("p1", paddleOpts, scene);
  paddle1.material = p1Mat;
  paddle1.position.z = -19;

  // Paddles du joueur 2 (toujours défini, même en cas de "neon")
  const paddle2 = paddle1.clone("p2");
  paddle2.material = p2Mat;
  paddle2.position.z = 19;

  // Si la map est "neon", appliquer un effet fluo aux paddles
  if (mopStyle === "neon") {
    p1Mat.emissiveColor = new Color3(1, 0.5, 0);  // Fluo orange pour le joueur 1
    p1Mat.specularPower = 32;  // Augmente la brillance pour un effet lumineux

    p2Mat.emissiveColor = new Color3(1, 1, 1);  // Fluo blanc pour le joueur 2
    p2Mat.specularPower = 32;  // Augmente la brillance pour un effet lumineux

    // Appliquer une couleur fluorescente à la balle sur la map neon
    ballMat.diffuseColor = Color3.Black();  // Balle reste noire sur la map neon
  }

  // Mini-paddle
  const miniPaddleOpts = { width: 4, height: 0.5, depth: 0.5 };
  const miniPaddle = MeshBuilder.CreateBox("miniPaddle", miniPaddleOpts, scene);
  miniPaddle.material = new StandardMaterial("whiteMat", scene);
  miniPaddle.position.set(0, 0, 0);

  // Balle
  const ball = MeshBuilder.CreateSphere("ball", { diameter: 0.5 }, scene);
  ball.material = ballMat;

  // Gestion du changement de couleur de la balle en fonction du paddle touché (sauf pour "neon")
  scene.onBeforeRenderObservable.add(() => {
    // Si la balle touche un paddle, changer de couleur en fonction du joueur qui touche
    if (ball.position.z < -19 && Math.abs(ball.position.x - paddle1.position.x) < 3) {
      if (mopStyle !== "neon") ballMat.diffuseColor = p1Mat.diffuseColor;  // La balle devient la couleur du joueur 1
    } else if (ball.position.z > 19 && Math.abs(ball.position.x - paddle2.position.x) < 3) {
      if (mopStyle !== "neon") ballMat.diffuseColor = p2Mat.diffuseColor;  // La balle devient la couleur du joueur 2
    }
  });

  // Bouton UI pour réinitialiser la caméra
  const resetCameraButton = document.createElement("button");
  resetCameraButton.textContent = "Réinitialiser la caméra";
  resetCameraButton.style.position = "absolute";
  resetCameraButton.style.top = "10px";
  resetCameraButton.style.left = "10px";
  resetCameraButton.style.padding = "10px";
  resetCameraButton.style.fontSize = "16px";
  resetCameraButton.style.cursor = "pointer";
  resetCameraButton.onclick = () => {
    camera.setPosition(new Vector3(0, 35, 35));  // Position d'origine de la caméra
    camera.setTarget(Vector3.Zero());  // Pointage vers l'origine
  };
  document.body.appendChild(resetCameraButton);

  return {
    scene,
    camera,
    allHitSounds,
    paddle1,
    paddle2, // paddle2 maintenant défini en dehors du bloc conditionnel
    miniPaddle,
    ball,
    p1Mat,
    p2Mat,
    ballMat
  };
};
