const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const gravity = 0.55;
const flapStrength = -10;
const pipeWidth = 80;
const pipeGap = 170;
const basePipeSpeed = 2.8;
const maxPipeSpeed = 4.6;
const pipeInterval = 1500;
const birdRadius = 18;
const groundHeight = 90;

let bird = { x: 90, y: canvas.height / 2, vy: 0, wingFrame: 0 };
let pipes = [];
let score = 0;
let bestScore = 0;
let lastPipeTime = 0;
let gameOver = false;
let started = false;
let lastTimestamp = 0;
let groundOffset = 0;
let currentPipeSpeed = basePipeSpeed;
let combo = 0;
let maxCombo = 0;
let shakeAmount = 0;
let particles = [];
let scorePopups = [];
let frameCount = 0;
const clouds = [];
const info = document.getElementById('gameInfo');
const startButton = document.getElementById('startButton');
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function createClouds() {
  const positions = [
    { x: 60, y: 90, scale: 1.1 },
    { x: 240, y: 70, scale: 0.96 },
    { x: 390, y: 120, scale: 1.2 },
  ];

  positions.forEach(pos => clouds.push({ x: pos.x, y: pos.y, scale: pos.scale }));
}

function playSound(type) {
  if (!audioContext) return;
  if (audioContext.state === 'suspended') audioContext.resume();

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  if (type === 'flap') {
    oscillator.type = 'triangle';
    oscillator.frequency.value = 420;
    gain.gain.value = 0.08;
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.06);
  } else if (type === 'score') {
    oscillator.type = 'sine';
    oscillator.frequency.value = 620;
    gain.gain.value = 0.08;
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
  } else if (type === 'combo') {
    oscillator.type = 'sine';
    oscillator.frequency.value = 800;
    gain.gain.value = 0.1;
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.08);
  } else if (type === 'hit') {
    oscillator.type = 'square';
    oscillator.frequency.value = 180;
    gain.gain.value = 0.14;
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.16);
  }
}

function createParticle(x, y, type) {
  const count = type === 'flap' ? 3 : 8;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
    const speed = type === 'flap' ? 2 + Math.random() * 2 : 3 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      type,
    });
  }
}

function shake(intensity) {
  shakeAmount = intensity;
}


function resetGame() {
  bird = { x: 90, y: canvas.height / 2, vy: 0, wingFrame: 0 };
  pipes = [];
  score = 0;
  combo = 0;
  maxCombo = 0;
  lastPipeTime = 0;
  gameOver = false;
  started = false;
  lastTimestamp = 0;
  groundOffset = 0;
  currentPipeSpeed = basePipeSpeed;
  shakeAmount = 0;
  particles = [];
  scorePopups = [];
  info.textContent = 'Press Start to begin.';
  startButton.textContent = 'Start';
  startButton.style.display = 'block';
}

function startGame() {
  if (audioContext.state === 'suspended') audioContext.resume();
  bird = { x: 90, y: canvas.height / 2, vy: 0, wingFrame: 0 };
  pipes = [];
  score = 0;
  combo = 0;
  lastPipeTime = 0;
  gameOver = false;
  started = true;
  lastTimestamp = 0;
  currentPipeSpeed = basePipeSpeed;
  shakeAmount = 0;
  particles = [];
  scorePopups = [];
  info.textContent = 'Tap or press Space to flap.';
  startButton.style.display = 'none';
}

function createPipe() {
  const minTop = 70;
  const maxTop = canvas.height - pipeGap - groundHeight - 40;
  const topHeight = minTop + Math.random() * (maxTop - minTop);
  pipes.push({ x: canvas.width + 40, top: topHeight, passed: false });
}

function endGame() {
  if (!gameOver) {
    playSound('hit');
    createParticle(bird.x, bird.y, 'hit');
    shake(8);
  }
  gameOver = true;
  started = false;
  bestScore = Math.max(bestScore, score);
  maxCombo = Math.max(maxCombo, combo);
  combo = 0;
  info.textContent = 'Game Over! Press Start or Space to play again.';
  startButton.textContent = 'Restart';
  startButton.style.display = 'block';
}

function update() {
  if (!started || gameOver) return;

  frameCount++;
  bird.wingFrame = Math.floor((frameCount / 5) % 4);
  bird.vy += gravity;
  bird.y += bird.vy;
  currentPipeSpeed = Math.min(maxPipeSpeed, basePipeSpeed + score * 0.08);
  groundOffset = (groundOffset - currentPipeSpeed) % 40;
  shakeAmount *= 0.92;

  particles.forEach((p, i) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15;
    p.life -= 0.02;
    if (p.life <= 0) particles.splice(i, 1);
  });

  scorePopups.forEach((p, i) => {
    p.y -= 1;
    p.life -= 0.01;
    if (p.life <= 0) scorePopups.splice(i, 1);
  });

  if (bird.y + birdRadius >= canvas.height - groundHeight) {
    bird.y = canvas.height - groundHeight - birdRadius;
    endGame();
  }

  if (bird.y - birdRadius <= 10) {
    bird.y = 10 + birdRadius;
    bird.vy = 0;
  }

  const now = performance.now();
  if (lastPipeTime === 0 || now - lastPipeTime >= pipeInterval) {
    createPipe();
    lastPipeTime = now;
  }

  pipes.forEach(pipe => {
    pipe.x -= currentPipeSpeed;

    if (!pipe.passed && pipe.x + pipeWidth < bird.x) {
      pipe.passed = true;
      combo++;
      maxCombo = Math.max(maxCombo, combo);
      const scoreGain = combo > 1 ? combo : 1;
      score += scoreGain;
      scorePopups.push({ x: bird.x, y: bird.y - 30, life: 1, text: scoreGain > 1 ? `+${scoreGain}x` : '+1' });
      playSound(combo > 1 ? 'combo' : 'score');
    }

    const hitLeft = bird.x + birdRadius > pipe.x;
    const hitRight = bird.x - birdRadius < pipe.x + pipeWidth;
    const hitTop = bird.y - birdRadius < pipe.top;
    const hitBottom = bird.y + birdRadius > pipe.top + pipeGap;

    if (hitLeft && hitRight && (hitTop || hitBottom)) {
      endGame();
    }
  });

  pipes = pipes.filter(pipe => pipe.x + pipeWidth > -60);
}

function drawSky() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#70d1ef');
  gradient.addColorStop(0.4, '#5ac0e0');
  gradient.addColorStop(1, '#49a8d4');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawClouds() {
  clouds.forEach(cloud => {
    cloud.x = (cloud.x + currentPipeSpeed * 0.18) % (canvas.width + 180) - 90;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.86)';
    ctx.beginPath();
    ctx.arc(cloud.x, cloud.y, 18 * cloud.scale, 0, Math.PI * 2);
    ctx.arc(cloud.x + 24 * cloud.scale, cloud.y - 12 * cloud.scale, 20 * cloud.scale, 0, Math.PI * 2);
    ctx.arc(cloud.x + 46 * cloud.scale, cloud.y + 4 * cloud.scale, 16 * cloud.scale, 0, Math.PI * 2);
    ctx.arc(cloud.x + 20 * cloud.scale, cloud.y + 16 * cloud.scale, 16 * cloud.scale, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  });
}

function drawGround() {
  ctx.fillStyle = '#4a2f0e';
  ctx.fillRect(0, canvas.height - groundHeight, canvas.width, groundHeight);

  ctx.fillStyle = '#3d2310';
  for (let x = groundOffset; x < canvas.width + 40; x += 40) {
    ctx.fillRect(x, canvas.height - groundHeight, 24, groundHeight);
  }

  ctx.fillStyle = '#7e562f';
  ctx.fillRect(0, canvas.height - groundHeight - 4, canvas.width, 4);
}

function drawPipes() {
  pipes.forEach(pipe => {
    const gradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipeWidth, 0);
    gradient.addColorStop(0, '#4a8a37');
    gradient.addColorStop(1, '#2d6621');

    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#1e4c16';
    ctx.lineWidth = 6;

    ctx.fillRect(pipe.x, 0, pipeWidth, pipe.top);
    ctx.strokeRect(pipe.x, 0, pipeWidth, pipe.top);
    ctx.fillRect(pipe.x, pipe.top + pipeGap, pipeWidth, canvas.height - groundHeight - pipe.top - pipeGap);
    ctx.strokeRect(pipe.x, pipe.top + pipeGap, pipeWidth, canvas.height - groundHeight - pipe.top - pipeGap);

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(pipe.x + 10, 12, 18, pipe.top - 18);
    ctx.fillRect(pipe.x + 10, pipe.top + pipeGap + 12, 18, canvas.height - groundHeight - pipe.top - pipeGap - 18);
  });
}

function drawBird() {
  const rotation = Math.max(-0.5, Math.min(0.9, bird.vy * 0.05));
  const wingOffsets = [0, -2, -3, -2];
  const wingOffset = wingOffsets[bird.wingFrame];

  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(rotation);

  ctx.fillStyle = '#ffd53e';
  ctx.beginPath();
  ctx.arc(0, 0, birdRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ff8b15';
  ctx.beginPath();
  ctx.arc(10, -10, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(5, -8, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(7, -10, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffb844';
  ctx.beginPath();
  ctx.ellipse(20, 1, 14, 8, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffd86d';
  ctx.beginPath();
  ctx.moveTo(-8, -3 + wingOffset);
  ctx.lineTo(-20, -10 + wingOffset);
  ctx.lineTo(-16, 8 + wingOffset);
  ctx.fill();

  ctx.restore();
}

function drawParticles() {
  particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life);
    if (p.type === 'flap') {
      ctx.fillStyle = '#ffd53e';
    } else {
      ctx.fillStyle = '#ff4444';
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawScorePopups() {
  scorePopups.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.text.includes('x') ? '#ffeb3b' : '#fff';
    ctx.font = p.text.includes('x') ? 'bold 20px Arial' : '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(p.text, p.x, p.y);
  });
  ctx.globalAlpha = 1;
}

function drawHUD() {
  const difficultyLevel = Math.floor(score / 5) + 1;

  if (!started) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.33)';
    ctx.fillRect(40, 180, canvas.width - 80, 160);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 42px Arial';
    ctx.fillText('Flappy Bird', canvas.width / 2, 240);
    ctx.font = '18px Arial';
    ctx.fillText('Tap Start or press Space to begin.', canvas.width / 2, 280);
    ctx.fillText('Avoid the pipes and beat your best score.', canvas.width / 2, 310);
    ctx.restore();
  }

  if (!gameOver) {
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#1b3f5b';
    ctx.lineWidth = 8;
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.strokeText(score, canvas.width / 2, 80);
    ctx.fillText(score, canvas.width / 2, 80);

    ctx.font = '18px Arial';
    ctx.textAlign = 'left';
    ctx.strokeText(`Best: ${bestScore}`, 22, 40);
    ctx.fillText(`Best: ${bestScore}`, 22, 40);

    if (combo > 0) {
      ctx.fillStyle = combo > 3 ? '#ffeb3b' : '#fff';
      ctx.font = combo > 3 ? 'bold 24px Arial' : '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${combo}x Combo`, canvas.width / 2, canvas.height - 120);
    }

    ctx.fillStyle = '#fff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`Level: ${difficultyLevel}`, canvas.width - 22, 40);
  }

  if (gameOver) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(50, canvas.height / 2 - 100, canvas.width - 100, 200);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 38px Arial';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 50);
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${score}  Best: ${bestScore}`, canvas.width / 2, canvas.height / 2);
    if (maxCombo > 1) {
      ctx.fillText(`Max Combo: ${maxCombo}x`, canvas.width / 2, canvas.height / 2 + 30);
    }
    ctx.fillText('Press Start or Space to retry', canvas.width / 2, canvas.height / 2 + 60);
    ctx.restore();
  }
}

function draw() {
  const shakeX = (Math.random() - 0.5) * shakeAmount;
  const shakeY = (Math.random() - 0.5) * shakeAmount;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  drawSky();
  drawClouds();
  drawPipes();
  drawGround();
  drawBird();
  drawParticles();
  drawScorePopups();
  drawHUD();

  ctx.restore();
}

function gameLoop(timestamp) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

function flap() {
  if (!started || gameOver) {
    startGame();
    return;
  }

  bird.vy = flapStrength;
  createParticle(bird.x - 15, bird.y, 'flap');
  playSound('flap');
}

window.addEventListener('keydown', event => {
  if (event.code === 'Space') {
    event.preventDefault();
    flap();
  }
});

canvas.addEventListener('mousedown', () => flap());
canvas.addEventListener('touchstart', event => {
  event.preventDefault();
  flap();
}, { passive: false });

startButton.addEventListener('click', startGame);

createClouds();
resetGame();
requestAnimationFrame(gameLoop);
