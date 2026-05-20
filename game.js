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

let bird = { x: 90, y: canvas.height / 2, vy: 0 };
let pipes = [];
let score = 0;
let bestScore = 0;
let lastPipeTime = 0;
let gameOver = false;
let started = false;
let lastTimestamp = 0;
let groundOffset = 0;
let currentPipeSpeed = basePipeSpeed;
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
  } else if (type === 'hit') {
    oscillator.type = 'square';
    oscillator.frequency.value = 180;
    gain.gain.value = 0.14;
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.16);
  }
}

function resetGame() {
  bird = { x: 90, y: canvas.height / 2, vy: 0 };
  pipes = [];
  score = 0;
  lastPipeTime = 0;
  gameOver = false;
  started = false;
  lastTimestamp = 0;
  groundOffset = 0;
  currentPipeSpeed = basePipeSpeed;
  info.textContent = 'Press Start to begin.';
  startButton.textContent = 'Start';
  startButton.style.display = 'block';
}

function startGame() {
  if (audioContext.state === 'suspended') audioContext.resume();
  bird = { x: 90, y: canvas.height / 2, vy: 0 };
  pipes = [];
  score = 0;
  lastPipeTime = 0;
  gameOver = false;
  started = true;
  lastTimestamp = 0;
  currentPipeSpeed = basePipeSpeed;
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
  if (!gameOver) playSound('hit');
  gameOver = true;
  started = false;
  bestScore = Math.max(bestScore, score);
  info.textContent = 'Game Over! Press Start or Space to play again.';
  startButton.textContent = 'Restart';
  startButton.style.display = 'block';
}

function update() {
  if (!started || gameOver) return;

  bird.vy += gravity;
  bird.y += bird.vy;
  currentPipeSpeed = Math.min(maxPipeSpeed, basePipeSpeed + score * 0.08);
  groundOffset = (groundOffset - currentPipeSpeed) % 40;

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
      score += 1;
      playSound('score');
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
  ctx.moveTo(-8, -3);
  ctx.lineTo(-20, -10);
  ctx.lineTo(-16, 8);
  ctx.fill();

  ctx.restore();
}

function drawHUD() {
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
  }

  if (gameOver) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(50, canvas.height / 2 - 100, canvas.width - 100, 160);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 38px Arial';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 40);
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2);
    ctx.fillText('Press Start or Space to retry', canvas.width / 2, canvas.height / 2 + 40);
    ctx.restore();
  }
}

function draw() {
  drawSky();
  drawClouds();
  drawPipes();
  drawGround();
  drawBird();
  drawHUD();
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
