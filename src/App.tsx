import React, { useEffect, useRef, useState } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import "./App.css";

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [objects, setObjects] = useState([
    { id: 1, color: "red", x: 80, y: 100 },
    { id: 2, color: "yellow", x: 160, y: 100 },
    { id: 3, color: "cyan", x: 240, y: 100 },
    { id: 4, color: "green", x: 320, y: 100 },
    { id: 5, color: "purple", x: 400, y: 100 },
    { id: 6, color: "orange", x: 480, y: 100 },
    { id: 7, color: "gray", x: 560, y: 100 },
  ]);
  const [targets] = useState([
    { id: 1, color: "red", x: 80, y: 400 },
    { id: 2, color: "yellow", x: 160, y: 400 },
    { id: 3, color: "cyan", x: 240, y: 400 },
    { id: 4, color: "green", x: 320, y: 400 },
    { id: 5, color: "purple", x: 400, y: 400 },
    { id: 6, color: "orange", x: 480, y: 400 },
    { id: 7, color: "gray", x: 560, y: 400 },
  ]);

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const savedHighScore = localStorage.getItem("highScore");
    return savedHighScore ? parseInt(savedHighScore, 10) : 0;
  });
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameActive, setGameActive] = useState(false); // Изменено на false для стартового экрана
  const [draggingObjectId, setDraggingObjectId] = useState<number | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false); // Новое состояние для отслеживания старта игры

  useEffect(() => {
    if (!gameActive || isGameOver || !gameStarted) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameActive, isGameOver, gameStarted]);

  useEffect(() => {
    if (!gameStarted) return; // Не запускать обработку рук, пока игра не начата

    const hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults((results) => {
      const canvasCtx = canvasRef.current?.getContext("2d");
      if (canvasCtx && canvasRef.current && videoRef.current) {
        canvasCtx.save();
        canvasCtx.clearRect(
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height,
        );
        canvasCtx.translate(canvasRef.current.width, 0);
        canvasCtx.scale(-1, 1);
        canvasCtx.drawImage(
          results.image,
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height,
        );
        if (results.multiHandLandmarks) {
          for (const landmarks of results.multiHandLandmarks) {
            drawConnectors(canvasCtx, landmarks, Hands.HAND_CONNECTIONS, {
              color: "#00FF00",
              lineWidth: 2,
            });
            drawLandmarks(canvasCtx, landmarks, {
              color: "#FF0000",
              lineWidth: 1,
            });
          }
        }
        canvasCtx.restore();

        if (
          results.multiHandLandmarks &&
          results.multiHandLandmarks.length > 0
        ) {
          const indexFingerTip = results.multiHandLandmarks[0][8];
          const x = indexFingerTip.x * canvasRef.current.width;
          const y = indexFingerTip.y * canvasRef.current.height;

          if (draggingObjectId !== null) {
            setObjects((prevObjects) =>
              prevObjects.map((obj) =>
                obj.id === draggingObjectId
                  ? { ...obj, x: canvasRef.current!.width - x, y }
                  : obj,
              ),
            );
          } else {
            setObjects((prevObjects) =>
              prevObjects.map((obj) => {
                if (
                  Math.abs(canvasRef.current!.width - x - obj.x) < 25 &&
                  Math.abs(y - obj.y) < 25
                ) {
                  setDraggingObjectId(obj.id);
                }
                return obj;
              }),
            );
          }
        }
      }
    });

    if (videoRef.current) {
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          try {
            if (videoRef.current) {
              await hands.send({ image: videoRef.current });
            }
          } catch (error) {
            console.error("Ошибка при отправке кадра в MediaPipe:", error);
          }
        },
        width: 640,
        height: 480,
      });
      camera.start();
    }
  }, [draggingObjectId, gameStarted]);

  useEffect(() => {
    if (!gameActive || isGameOver || !gameStarted) return;

    setObjects((prevObjects) => {
      const remainingObjects = prevObjects.filter((obj) => {
        const target = targets.find(
          (t) => Math.abs(obj.x - t.x) < 25 && Math.abs(obj.y - t.y) < 25,
        );

        if (target) {
          if (obj.color === target.color) {
            setScore((prevScore) => prevScore + 2);
          } else {
            setIsGameOver(true);
          }
          return false;
        }
        return true;
      });

      return remainingObjects;
    });
  }, [objects, targets, gameActive, isGameOver, gameStarted]);

  useEffect(() => {
    if (!gameStarted) return;

    if (objects.length === 0 && gameActive && !isGameOver) {
      setGameActive(false);
      setScore((prev) => prev + timeLeft * 2);
      setTimeout(() => {
        setObjects([
          { id: Date.now() + 1, color: getRandomColor(), x: 80, y: 100 },
          { id: Date.now() + 2, color: getRandomColor(), x: 160, y: 100 },
          { id: Date.now() + 3, color: getRandomColor(), x: 240, y: 100 },
          { id: Date.now() + 4, color: getRandomColor(), x: 320, y: 100 },
          { id: Date.now() + 5, color: getRandomColor(), x: 400, y: 100 },
          { id: Date.now() + 6, color: getRandomColor(), x: 480, y: 100 },
          { id: Date.now() + 7, color: getRandomColor(), x: 560, y: 100 },
        ]);
        setTimeLeft(30);
        setGameActive(true);
      }, 1500);
    }
  }, [objects, gameActive, isGameOver, timeLeft, gameStarted]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem("highScore", score.toString());
    }
  }, [score, highScore]);

  const getRandomColor = () => {
    const colors = [
      "red",
      "yellow",
      "cyan",
      "green",
      "purple",
      "orange",
      "gray",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleRestart = () => {
    window.location.reload();
  };

  const handleStartGame = () => {
    setGameStarted(true);
    setGameActive(true);
  };

  return (
    <div className="app-container">
      <h1 className="game-title">Шары</h1>

      {!gameStarted ? (
        <div className="start-screen">
          <div className="instructions-container">
            <div className="instructions-card">
              <h2 className="instructions-title"> Инструкция к игре "Шары"</h2>
              <div className="instructions-content">
                <div className="instruction-item">
                  <div className="instruction-number">1</div>
                  <p>Поднесите руку к камере</p>
                </div>
                <div className="instruction-item">
                  <div className="instruction-number">2</div>
                  <p>
                    Наведите указательный палец на шар в верхней части экрана
                  </p>
                </div>
                <div className="instruction-item">
                  <div className="instruction-number">3</div>
                  <p>Перетащите шар на соответствующий по цвету круг внизу</p>
                </div>
                <div className="instruction-item">
                  <div className="instruction-number">4</div>
                  <p>Правильное совпадение цветов даёт +4 очка</p>
                </div>
                <div className="instruction-item">
                  <div className="instruction-number">5</div>
                  <p>Неправильное совпадение заканчивает игру</p>
                </div>
                <div className="instruction-item">
                  <div className="instruction-number">6</div>
                  <p>У вас есть 30 секунд на каждый уровень</p>
                </div>
              </div>
              <button className="start-button pulse" onClick={handleStartGame}>
                Начать игру
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="game-info">
            <h2>Счёт: {score}</h2>
            <h2>Рекорд: {highScore}</h2>
            <h2 className={timeLeft < 10 ? "time-warning" : ""}>
              Время: {timeLeft} сек
            </h2>
          </div>

          {isGameOver && (
            <div className="game-overlay">
              <div className="game-over-content">
                <h2 style={{ color: "red" }}>Время вышло! Игра окончена!</h2>
                <button className="game-over-button" onClick={handleRestart}>
                  Начать заново
                </button>
              </div>
            </div>
          )}

          <div className="game-container">
            <video ref={videoRef} style={{ display: "none" }} />
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              style={{ position: "absolute", top: 0, left: 0 }}
            />
            {objects.map((obj) => (
              <div
                key={obj.id}
                className="game-object"
                style={{
                  left: obj.x - 25,
                  top: obj.y - 25,
                  backgroundColor: obj.color,
                }}
              />
            ))}
            {targets.map((target) => (
              <div
                key={target.id}
                className="game-target"
                style={{
                  left: target.x - 25,
                  top: target.y - 25,
                  backgroundColor: target.color,
                  opacity: 0.5,
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default App;
