import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  RotateCcw, 
  Gamepad2, 
  HelpCircle,
  Sparkles,
  Info,
  Settings
} from 'lucide-react';

import { THEMES, ACHIEVEMENTS, DIFFICULTIES } from './utils/gameData';
import { 
  playEatSound, 
  playCrashSound, 
  playLevelUpSound, 
  playHoverSound,
  setMuted
} from './utils/audio';

import ThemeSelector from './components/ThemeSelector';
import Achievements from './components/Achievements';

const GRID_SIZE = 20;
const CANVAS_SIZE = 400;
const TILE_COUNT = CANVAS_SIZE / GRID_SIZE;

export default function App() {
  // --- Game Settings & Theme state ---
  const [activeTheme, setActiveTheme] = useState(() => {
    const saved = localStorage.getItem('snakeTheme');
    return saved && THEMES[saved] ? THEMES[saved] : THEMES.cyberpunk;
  });
  
  const [difficulty, setDifficulty] = useState(() => {
    const saved = localStorage.getItem('snakeDifficulty');
    return saved && DIFFICULTIES[saved] ? DIFFICULTIES[saved] : DIFFICULTIES.medium;
  });

  const [isAudioMuted, setIsAudioMuted] = useState(() => {
    const saved = localStorage.getItem('snakeAudioMuted');
    const isMuted = saved === 'true';
    setMuted(isMuted);
    return isMuted;
  });

  const [wrapAround, setWrapAround] = useState(() => {
    const saved = localStorage.getItem('snakeWrapAround');
    return saved !== 'false';
  });

  // --- Game Play State ---
  const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
  const [food, setFood] = useState({ x: 15, y: 15 });
  const [foodType, setFoodType] = useState('normal'); 
  const [direction, setDirection] = useState({ x: 0, y: 0 });
  const [isGameOver, setIsGameOver] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('snakeHighScore') || '0', 10);
  });
  const [level, setLevel] = useState(1);
  
  // --- Achievements & Exploration state ---
  const [unlockedAchievements, setUnlockedAchievements] = useState(() => {
    const saved = localStorage.getItem('snakeUnlockedAchievements');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [exploredThemes, setExploredThemes] = useState(() => {
    const saved = localStorage.getItem('snakeExploredThemes');
    return saved ? JSON.parse(saved) : [activeTheme.id];
  });

  // Refs to avoid stale closures in game loop
  const snakeRef = useRef(snake);
  const directionRef = useRef(direction);
  const foodRef = useRef(food);
  const isPausedRef = useRef(isPaused);
  const isGameOverRef = useRef(isGameOver);
  const isStartedRef = useRef(isStarted);

  // Sync refs with state
  useEffect(() => { snakeRef.current = snake; }, [snake]);
  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { foodRef.current = food; }, [food]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { isGameOverRef.current = isGameOver; }, [isGameOver]);
  useEffect(() => { isStartedRef.current = isStarted; }, [isStarted]);

  // --- Dynamic Theme Styles Injection ---
  useEffect(() => {
    document.documentElement.style.setProperty('--theme-gradient', activeTheme.snakeBody);
    document.documentElement.style.setProperty('--theme-accent', activeTheme.accent);
    document.documentElement.style.setProperty('--theme-glow', activeTheme.glowColor);
    document.documentElement.style.setProperty('--theme-canvas-bg', activeTheme.canvasBg);
    document.documentElement.style.setProperty('--theme-card-bg', activeTheme.cardBg);
  }, [activeTheme]);

  const handleSelectTheme = (theme) => {
    setActiveTheme(theme);
    localStorage.setItem('snakeTheme', theme.id);
    
    if (!exploredThemes.includes(theme.id)) {
      const updated = [...exploredThemes, theme.id];
      setExploredThemes(updated);
      localStorage.setItem('snakeExploredThemes', JSON.stringify(updated));
      
      if (updated.length >= 4) {
        unlockAchievement('theme_explorer');
      }
    }
  };

  const handleSelectDifficulty = (diff) => {
    setDifficulty(diff);
    localStorage.setItem('snakeDifficulty', diff.id);
    playHoverSound();
    resetGame();
  };

  const toggleMute = () => {
    const nextMute = !isAudioMuted;
    setIsAudioMuted(nextMute);
    setMuted(nextMute);
    localStorage.setItem('snakeAudioMuted', String(nextMute));
    playHoverSound();
  };

  const toggleWrapAround = () => {
    setWrapAround(prev => {
      const next = !prev;
      localStorage.setItem('snakeWrapAround', String(next));
      return next;
    });
    playHoverSound();
  };

  const unlockAchievement = useCallback((id) => {
    setUnlockedAchievements((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem('snakeUnlockedAchievements', JSON.stringify(next));
      
      confetti({
        particleCount: 40,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 }
      });
      confetti({
        particleCount: 40,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 }
      });

      return next;
    });
  }, []);

  const spawnFood = useCallback((currentSnake) => {
    let newFood;
    let onSnake = true;

    while (onSnake) {
      newFood = {
        x: Math.floor(Math.random() * TILE_COUNT),
        y: Math.floor(Math.random() * TILE_COUNT)
      };

      onSnake = currentSnake.some(
        (segment) => segment.x === newFood.x && segment.y === newFood.y
      );
    }

    setFood(newFood);
    setFoodType(Math.random() < 0.15 ? 'gold' : 'normal');
  }, []);

  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setDirection({ x: 0, y: 0 });
    setIsGameOver(false);
    setIsPaused(false);
    setIsStarted(false);
    setScore(0);
    setLevel(1);
    spawnFood([{ x: 10, y: 10 }]);
  };

  const gameStep = useCallback(() => {
    if (isPausedRef.current || isGameOverRef.current || !isStartedRef.current) return;

    const head = snakeRef.current[0];
    const dir = directionRef.current;

    if (dir.x === 0 && dir.y === 0) return;

    let newHead = { x: head.x + dir.x, y: head.y + dir.y };

    if (wrapAround) {
      if (newHead.x < 0) newHead.x = TILE_COUNT - 1;
      if (newHead.x >= TILE_COUNT) newHead.x = 0;
      if (newHead.y < 0) newHead.y = TILE_COUNT - 1;
      if (newHead.y >= TILE_COUNT) newHead.y = 0;
    } else {
      if (
        newHead.x < 0 ||
        newHead.x >= TILE_COUNT ||
        newHead.y < 0 ||
        newHead.y >= TILE_COUNT
      ) {
        handleGameOver();
        return;
      }
    }

    const hitSelf = snakeRef.current.some(
      (segment) => segment.x === newHead.x && segment.y === newHead.y
    );

    if (hitSelf) {
      handleGameOver();
      return;
    }

    const currentFood = foodRef.current;
    const ateFood = newHead.x === currentFood.x && newHead.y === currentFood.y;
    const newSnake = [newHead, ...snakeRef.current];

    if (ateFood) {
      const basePoints = foodType === 'gold' ? 30 : 10;
      const points = Math.round(basePoints * difficulty.multiplier);
      
      playEatSound();
      
      const newScore = score + points;
      setScore(newScore);

      const nextLevel = Math.floor(newScore / 50) + 1;
      if (nextLevel > level) {
        setLevel(nextLevel);
        playLevelUpSound();
      }

      if (newScore > 0) unlockAchievement('first_bite');
      if (newSnake.length >= 15) unlockAchievement('length_15');
      if (newScore >= 200) unlockAchievement('score_200');
      if (difficulty.id === 'insane' && newScore >= 100) unlockAchievement('speed_demon');
      if (!wrapAround && newScore >= 150) unlockAchievement('unbroken');

      if (newScore > highScore) {
        setHighScore(newScore);
        localStorage.setItem('snakeHighScore', String(newScore));
      }

      spawnFood(newSnake);
    } else {
      newSnake.pop();
    }

    setSnake(newSnake);
  }, [difficulty, score, level, highScore, wrapAround, foodType, spawnFood, unlockAchievement]);

  const handleGameOver = () => {
    setIsGameOver(true);
    playCrashSound();
    
    if (score === highScore && score > 0) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      if (!isStartedRef.current && !isGameOverRef.current) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD'].includes(e.code)) {
          setIsStarted(true);
        }
      }

      if (e.code === 'Space') {
        if (isGameOverRef.current) {
          resetGame();
        } else if (isStartedRef.current) {
          setIsPaused((prev) => !prev);
          playHoverSound();
        }
        return;
      }

      if (isPausedRef.current || isGameOverRef.current) return;

      const dir = directionRef.current;
      let nextDir = null;

      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          if (dir.y !== 1) nextDir = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
        case 'KeyS':
          if (dir.y !== -1) nextDir = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
        case 'KeyA':
          if (dir.x !== 1) nextDir = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
        case 'KeyD':
          if (dir.x !== -1) nextDir = { x: 1, y: 0 };
          break;
        default:
          break;
      }

      if (nextDir) {
        setDirection(nextDir);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = activeTheme.canvasBg;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.strokeStyle = activeTheme.gridLine;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= TILE_COUNT; i++) {
      ctx.beginPath();
      ctx.moveTo(i * GRID_SIZE, 0);
      ctx.lineTo(i * GRID_SIZE, CANVAS_SIZE);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * GRID_SIZE);
      ctx.lineTo(CANVAS_SIZE, i * GRID_SIZE);
      ctx.stroke();
    }

    const fx = food.x * GRID_SIZE;
    const fy = food.y * GRID_SIZE;
    const radius = GRID_SIZE / 2;

    ctx.fillStyle = foodType === 'gold' ? '#f1c40f' : activeTheme.food;
    ctx.beginPath();
    ctx.arc(fx + radius, fy + radius, radius - 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = foodType === 'gold' ? '#fff' : activeTheme.foodShine;
    ctx.beginPath();
    ctx.arc(fx + radius - 2, fy + radius - 2, radius / 3, 0, Math.PI * 2);
    ctx.fill();

    snake.forEach((segment, index) => {
      const sx = segment.x * GRID_SIZE;
      const sy = segment.y * GRID_SIZE;
      const isHead = index === 0;

      if (isHead) {
        ctx.fillStyle = activeTheme.snakeHead;
        ctx.beginPath();
        ctx.roundRect(sx + 1, sy + 1, GRID_SIZE - 2, GRID_SIZE - 2, 6);
        ctx.fill();

        ctx.fillStyle = '#000';
        const eyeSize = 3;
        const eyeOffset = 5;
        const dir = directionRef.current;

        let eye1 = { x: sx + eyeOffset, y: sy + eyeOffset };
        let eye2 = { x: sx + GRID_SIZE - eyeOffset - eyeSize, y: sy + eyeOffset };

        if (dir.y === 1) {
          eye1 = { x: sx + eyeOffset, y: sy + GRID_SIZE - eyeOffset - eyeSize };
          eye2 = { x: sx + GRID_SIZE - eyeOffset - eyeSize, y: sy + GRID_SIZE - eyeOffset - eyeSize };
        } else if (dir.x === -1) {
          eye1 = { x: sx + eyeOffset, y: sy + eyeOffset };
          eye2 = { x: sx + eyeOffset, y: sy + GRID_SIZE - eyeOffset - eyeSize };
        } else if (dir.x === 1) {
          eye1 = { x: sx + GRID_SIZE - eyeOffset - eyeSize, y: sy + eyeOffset };
          eye2 = { x: sx + GRID_SIZE - eyeOffset - eyeSize, y: sy + GRID_SIZE - eyeOffset - eyeSize };
        }

        ctx.fillRect(eye1.x, eye1.y, eyeSize, eyeSize);
        ctx.fillRect(eye2.x, eye2.y, eyeSize, eyeSize);
      } else {
        const grad = ctx.createLinearGradient(sx, sy, sx + GRID_SIZE, sy + GRID_SIZE);
        
        if (activeTheme.id === 'cyberpunk') {
          grad.addColorStop(0, '#00f2fe');
          grad.addColorStop(1, '#4facfe');
        } else if (activeTheme.id === 'forest') {
          grad.addColorStop(0, '#2af598');
          grad.addColorStop(1, '#009efd');
        } else if (activeTheme.id === 'vaporwave') {
          grad.addColorStop(0, '#ff71ce');
          grad.addColorStop(1, '#b967ff');
        } else {
          grad.addColorStop(0, '#a29bfe');
          grad.addColorStop(1, '#6c5ce7');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(sx + 1.5, sy + 1.5, GRID_SIZE - 3, GRID_SIZE - 3, 4);
        ctx.fill();
      }
    });

  }, [snake, food, activeTheme, foodType]);

  useEffect(() => {
    const speedConfig = difficulty.speed;
    const levelModifier = Math.min(level * 3, 20); 
    const finalInterval = Math.max(speedConfig - levelModifier, 30);

    const timer = setInterval(gameStep, finalInterval);
    return () => clearInterval(timer);
  }, [gameStep, difficulty, level]);

  return (
    <div className="flex-col items-center justify-center p-6 gap-6 min-h-screen relative">
      {/* Floating Animated Background Blobs */}
      <div className="bg-blobs">
        <div className="blob blob-1" style={{ backgroundColor: activeTheme.accent }} />
        <div className="blob blob-2" style={{ backgroundColor: foodType === 'gold' ? '#f1c40f' : activeTheme.food }} />
      </div>

      {/* Header Panel */}
      <header className="app-header flex-row items-center justify-center gap-3">
        <div className={`header-icon-container ${activeTheme.glowClass}`}>
          <Gamepad2 className="w-8 h-8" style={{ color: activeTheme.accent }} />
        </div>
        <h1 className="text-gradient uppercase font-black" style={{ '--theme-gradient': activeTheme.snakeBody }}>
          Neon Snake
        </h1>
      </header>

      {/* Main Grid Layout */}
      <div className="game-layout">
        
        {/* Left Side: Controls & Info */}
        <div className="flex-col gap-4">
          <div className="glass-panel p-5 rounded-2xl flex-col gap-4">
            <div className="panel-header border-b pb-2 flex-row items-center gap-2">
              <Settings className="icon-sub" />
              <h2>Settings</h2>
            </div>

            {/* Difficulty Controls */}
            <div className="flex-col gap-2">
              <span className="label-setting uppercase">Difficulty</span>
              <div className="difficulty-grid gap-2">
                {Object.values(DIFFICULTIES).map((diff) => (
                  <button
                    key={diff.id}
                    onClick={() => handleSelectDifficulty(diff)}
                    className={`diff-btn ${difficulty.id === diff.id ? 'active' : ''}`}
                  >
                    {diff.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Config Toggles */}
            <div className="config-toggles border-t pt-3 flex-col gap-3">
              <div className="config-row flex-row items-center justify-between">
                <span className="config-label">Audio Synth Sound</span>
                <button 
                  onClick={toggleMute}
                  className={`btn-toggle icon-btn ${isAudioMuted ? 'muted' : 'active'}`}
                >
                  {isAudioMuted ? <VolumeX className="icon-sm" /> : <Volume2 className="icon-sm" />}
                </button>
              </div>

              <div className="config-row flex-row items-center justify-between">
                <span className="config-label">Wrap-Around Screen</span>
                <button 
                  onClick={toggleWrapAround}
                  className={`btn-toggle text-btn ${wrapAround ? 'enabled' : 'disabled'}`}
                >
                  {wrapAround ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>
            </div>
          </div>

          {/* Tutorial / Help Box */}
          <div className="glass-panel p-5 rounded-2xl flex-col gap-3 text-left">
            <div className="panel-header flex-row items-center gap-2">
              <HelpCircle className="icon-sm" />
              <span>How To Play</span>
            </div>
            <div className="tutorial-text flex-col gap-2">
              <p>🎮 Move using <b>Arrow Keys</b> or <b>WASD</b> keys.</p>
              <p>🍎 Eat food to score points. Golden apples give 3x points!</p>
              <p>⚡ Points scale based on speed & difficulty settings.</p>
              <p>⏸️ Press <b>SPACE</b> to pause or restart the game.</p>
            </div>
          </div>
        </div>

        {/* Center: Canvas & Score Board */}
        <div className="flex-col gap-4 items-center">
          
          {/* Score HUD Display */}
          <div className="glass-panel w-full rounded-2xl overflow-hidden hud-panel">
            <div className="hud-item p-4">
              <span className="hud-value" style={{ color: activeTheme.accent }}>{score}</span>
              <span className="hud-label">Score</span>
            </div>
            <div className="hud-item p-4 border-l">
              <span className="hud-value" style={{ color: activeTheme.accent }}>{highScore}</span>
              <span className="hud-label">Best</span>
            </div>
            <div className="hud-item p-4 border-l">
              <span className="hud-value" style={{ color: activeTheme.accent }}>{level}</span>
              <span className="hud-label">Level</span>
            </div>
          </div>

          {/* Game Canvas Container */}
          <div id="game-canvas-container" style={{ '--theme-glow': activeTheme.glowColor }}>
            <canvas 
              ref={canvasRef} 
              width={CANVAS_SIZE} 
              height={CANVAS_SIZE}
            />

            {/* Game Start/Pause/Over Overlays */}
            {!isStarted && !isGameOver && (
              <div className="overlay">
                <Play className="overlay-icon bounce" style={{ color: activeTheme.accent }} />
                <h3 className="overlay-title">Ready to Play?</h3>
                <p className="overlay-subtitle">Press WASD or Arrow Keys to Start</p>
                <button 
                  onClick={() => setIsStarted(true)} 
                  className="btn-primary py-3 px-8 rounded-xl text-sm"
                  style={{ '--theme-gradient': activeTheme.snakeBody }}
                >
                  Start Game
                </button>
              </div>
            )}

            {isPaused && !isGameOver && (
              <div className="overlay">
                <Pause className="overlay-icon" style={{ color: activeTheme.accent }} />
                <h3 className="overlay-title">Game Paused</h3>
                <p className="overlay-subtitle">Press SPACE to Resume</p>
                <button 
                  onClick={() => { setIsPaused(false); playHoverSound(); }} 
                  className="btn-primary py-3 px-8 rounded-xl text-sm"
                  style={{ '--theme-gradient': activeTheme.snakeBody }}
                >
                  Resume
                </button>
              </div>
            )}

            {isGameOver && (
              <div className="overlay">
                <RotateCcw className="overlay-icon rotate text-red" />
                <h3 className="overlay-title game-over-title">Game Over</h3>
                <p className="overlay-subtitle">Final Score: <b className="game-over-score" style={{ color: activeTheme.accent }}>{score}</b></p>
                {score === highScore && score > 0 && (
                  <p className="high-score-record text-amber">
                    <Sparkles className="icon-xs" />
                    New High Score Record!
                  </p>
                )}
                <button 
                  onClick={() => { resetGame(); playHoverSound(); }} 
                  className="btn-primary py-3 px-8 rounded-xl text-sm"
                  style={{ '--theme-gradient': activeTheme.snakeBody }}
                >
                  Play Again
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Theme & Achievements list */}
        <div className="flex-col gap-4">
          <ThemeSelector 
            activeTheme={activeTheme} 
            onSelectTheme={handleSelectTheme} 
          />
          <Achievements unlockedIds={unlockedAchievements} />
        </div>

      </div>

      {/* Footer Info */}
      <footer className="app-footer flex-row items-center gap-2">
        <Info className="icon-sm" />
        <span>Synthesized web-audio synth triggers active. Desktop keyboard recommended.</span>
      </footer>
    </div>
  );
}
