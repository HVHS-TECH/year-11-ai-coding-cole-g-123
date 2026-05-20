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
let bgScroll = 0;
const clouds = [];
const stars = [];
const grassTufts = [];
const bgShapes = [];
const decorElements = [];
const info = document.getElementById('gameInfo');
const startButton = document.getElementById('startButton');
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function createClouds() {
  const positions = [
    { x: 60, y: 90, scale: 1.1 },
    { x: 240, y: 70, scale: 0.96 },
    { x: 390, y: 120, scale: 1.2 },
  ];
  positions.forEach(pos => clouds.push({ x: pos.x, y: pos.y, scale: pos.scale, offset: 0 }));
}

function createStars() {
  for (let i = 0; i < 35; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * (canvas.height * 0.35),
      size: Math.random() * 1.5,
      opacity: 0.4 + Math.random() * 0.5,
    });
  }
}

function createGrass() {
  for (let i = 0; i < canvas.width / 15; i++) {
    grassTufts.push({
      x: i * 15,
      height: 4 + Math.random() * 6,
      width: 8 + Math.random() * 5,
    });
  }
}

function createBackgroundShapes() {
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#ffa502', '#9b59b6', '#1abc9c'];
  const spacing = 180;
  
  for (let i = -1; i < Math.ceil(canvas.width / spacing) + 2; i++) {
    // Far background - very slow parallax
    bgShapes.push({
      x: i * spacing,
      y: 50 + (i % 3) * 40,
      size: 30 + (i % 4) * 10,
      color: colors[i % colors.length],
      opacity: 0.08,
      layer: 0,
      type: i % 3 === 0 ? 'square' : (i % 3 === 1 ? 'circle' : 'triangle'),
    });
    
    // Mid background - moderate parallax
    bgShapes.push({
      x: i * spacing + 80,
      y: 150 + (i % 2) * 80,
      size: 20 + (i % 3) * 8,
      color: colors[(i + 2) % colors.length],
      opacity: 0.12,
      layer: 1,
      type: (i + 1) % 3 === 0 ? 'square' : ((i + 1) % 3 === 1 ? 'circle' : 'triangle'),
    });
  }
}

function createDecorations() {
  const decorColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#ffa502'];
  
  for (let i = 0; i < 8; i++) {
    decorElements.push({
      x: (i * 250) + Math.random() * 100,
      y: 80 + Math.random() * 180,
      size: 12 + Math.random() * 8,
      color: decorColors[i % decorColors.length],
      opacity: 0.15,
      float: Math.random() * Math.PI * 2,
      floatSpeed: 0.008 + Math.random() * 0.004,
      type: Math.random() > 0.5 ? 'square' : 'circle',
    });
  }
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
  bgScroll = 0;
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
  bgScroll = 0;
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
  bgScroll += currentPipeSpeed;
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
  gradient.addColorStop(0, '#87ceeb');
  gradient.addColorStop(0.3, '#5eb3d9');
  gradient.addColorStop(0.7, '#4a9fbb');
  gradient.addColorStop(1, '#3a8fa8');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw subtle atmospheric glow
  const glowGrad = ctx.createRadialGradient(canvas.width / 2, 0, 0, canvas.width / 2, 0, canvas.width);
  glowGrad.addColorStop(0, 'rgba(255, 200, 100, 0.08)');
  glowGrad.addColorStop(1, 'rgba(255, 150, 100, 0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height * 0.4);

  // Draw stars
  stars.forEach(star => {
    ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * 0.4})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawBackgroundLayers() {
  // Far background layer (slowest parallax)
  bgShapes.forEach(shape => {
    if (shape.layer === 0) {
      const parallaxX = (shape.x - bgScroll * 0.2) % (canvas.width + 400);
      ctx.globalAlpha = shape.opacity;
      ctx.fillStyle = shape.color;
      
      if (shape.type === 'square') {
        ctx.fillRect(parallaxX, shape.y, shape.size, shape.size);
      } else if (shape.type === 'circle') {
        ctx.beginPath();
        ctx.arc(parallaxX + shape.size / 2, shape.y + shape.size / 2, shape.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (shape.type === 'triangle') {
        ctx.beginPath();
        ctx.moveTo(parallaxX + shape.size / 2, shape.y);
        ctx.lineTo(parallaxX + shape.size, shape.y + shape.size);
        ctx.lineTo(parallaxX, shape.y + shape.size);
        ctx.closePath();
        ctx.fill();
      }
    }
  });

  // Mid background layer (moderate parallax)
  bgShapes.forEach(shape => {
    if (shape.layer === 1) {
      const parallaxX = (shape.x - bgScroll * 0.35) % (canvas.width + 400);
      ctx.globalAlpha = shape.opacity;
      ctx.fillStyle = shape.color;
      
      if (shape.type === 'square') {
        ctx.fillRect(parallaxX, shape.y, shape.size, shape.size);
      } else if (shape.type === 'circle') {
        ctx.beginPath();
        ctx.arc(parallaxX + shape.size / 2, shape.y + shape.size / 2, shape.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (shape.type === 'triangle') {
        ctx.beginPath();
        ctx.moveTo(parallaxX + shape.size / 2, shape.y);
        ctx.lineTo(parallaxX + shape.size, shape.y + shape.size);
        ctx.lineTo(parallaxX, shape.y + shape.size);
        ctx.closePath();
        ctx.fill();
      }
    }
  });

  // Floating decorative elements
  decorElements.forEach(elem => {
    const parallaxX = (elem.x - bgScroll * 0.4) % (canvas.width + 300);
    const floatY = elem.y + Math.sin(elem.float) * 8;
    elem.float += elem.floatSpeed;
    
    ctx.globalAlpha = elem.opacity;
    ctx.fillStyle = elem.color;
    
    if (elem.type === 'square') {
      ctx.save();
      ctx.translate(parallaxX + elem.size / 2, floatY + elem.size / 2);
      ctx.rotate(elem.float * 0.5);
      ctx.fillRect(-elem.size / 2, -elem.size / 2, elem.size, elem.size);
      ctx.restore();
    } else if (elem.type === 'circle') {
      ctx.beginPath();
      ctx.arc(parallaxX + elem.size / 2, floatY + elem.size / 2, elem.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  
  ctx.globalAlpha = 1;
}

function drawGridLines() {
  // Subtle grid overlay for depth
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.02)';
  ctx.lineWidth = 1;
  
  const gridSize = 80;
  const gridOffsetX = (bgScroll * 0.15) % gridSize;
  
  for (let x = -gridOffsetX; x < canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height * 0.5);
    ctx.stroke();
  }
  
  for (let y = 0; y < canvas.height * 0.5; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0 - gridOffsetX, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawClouds() {
  clouds.forEach((cloud, idx) => {
    cloud.x = (cloud.x + currentPipeSpeed * 0.18) % (canvas.width + 180) - 90;
    
    // Draw cloud shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.beginPath();
    ctx.ellipse(cloud.x + 5, cloud.y + 8, 60 * cloud.scale, 12 * cloud.scale, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw main cloud with fluffy effect
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.beginPath();
    ctx.arc(cloud.x, cloud.y, 18 * cloud.scale, 0, Math.PI * 2);
    ctx.arc(cloud.x + 24 * cloud.scale, cloud.y - 12 * cloud.scale, 22 * cloud.scale, 0, Math.PI * 2);
    ctx.arc(cloud.x + 46 * cloud.scale, cloud.y + 4 * cloud.scale, 18 * cloud.scale, 0, Math.PI * 2);
    ctx.arc(cloud.x + 20 * cloud.scale, cloud.y + 16 * cloud.scale, 18 * cloud.scale, 0, Math.PI * 2);
    ctx.arc(cloud.x + 12 * cloud.scale, cloud.y - 4 * cloud.scale, 14 * cloud.scale, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    
    // Cloud highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(cloud.x + 8 * cloud.scale, cloud.y - 6 * cloud.scale, 10 * cloud.scale, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawGround() {
  // Main ground fill
  ctx.fillStyle = '#5c3d1f';
  ctx.fillRect(0, canvas.height - groundHeight, canvas.width, groundHeight);

  // Ground layers
  ctx.fillStyle = '#4a2f0e';
  ctx.fillRect(0, canvas.height - groundHeight + 2, canvas.width, groundHeight - 2);

  // Dirt texture pattern
  ctx.fillStyle = '#3d2310';
  for (let x = groundOffset; x < canvas.width + 50; x += 40) {
    ctx.fillRect(x, canvas.height - groundHeight + 4, 24, groundHeight - 4);
  }

  // Soil variation
  ctx.fillStyle = '#6b4423';
  for (let x = groundOffset + 20; x < canvas.width + 50; x += 40) {
    ctx.fillRect(x, canvas.height - groundHeight + 6, 18, groundHeight - 6);
  }

  // Top grass line
  ctx.fillStyle = '#6d8c45';
  ctx.fillRect(0, canvas.height - groundHeight - 1, canvas.width, 3);

  // Grass tufts
  grassTufts.forEach((tuft, i) => {
    const xPos = (tuft.x + groundOffset * 0.6) % canvas.width;
    ctx.fillStyle = '#5a7a38';
    ctx.fillRect(xPos, canvas.height - groundHeight - tuft.height, tuft.width * 0.4, tuft.height);
    ctx.fillStyle = '#7a9a4a';
    ctx.fillRect(xPos + tuft.width * 0.35, canvas.height - groundHeight - tuft.height, tuft.width * 0.35, tuft.height);
  });

  // Ground shine/highlight
  ctx.fillStyle = 'rgba(200, 180, 160, 0.06)';
  ctx.fillRect(0, canvas.height - groundHeight - 2, canvas.width, 3);
}

function drawPipes() {
  pipes.forEach(pipe => {
    const topPipeHeight = pipe.top;
    const bottomPipeStart = pipe.top + pipeGap;
    const bottomPipeHeight = canvas.height - groundHeight - bottomPipeStart;

    // Top pipe
    const topGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipeWidth, 0);
    topGradient.addColorStop(0, '#5aa844');
    topGradient.addColorStop(0.5, '#3d8a37');
    topGradient.addColorStop(1, '#2d6621');
    ctx.fillStyle = topGradient;
    ctx.fillRect(pipe.x, 0, pipeWidth, topPipeHeight);

    // Top pipe outline and highlight
    ctx.strokeStyle = '#1e4c16';
    ctx.lineWidth = 4;
    ctx.strokeRect(pipe.x, 0, pipeWidth, topPipeHeight);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(pipe.x + 2, 2, pipeWidth - 4, topPipeHeight * 0.15);

    // Top pipe cap
    ctx.fillStyle = '#2d5c1d';
    ctx.fillRect(pipe.x - 6, topPipeHeight - 6, pipeWidth + 12, 6);
    ctx.strokeStyle = '#1e3c0d';
    ctx.lineWidth = 2;
    ctx.strokeRect(pipe.x - 6, topPipeHeight - 6, pipeWidth + 12, 6);

    // Bottom pipe
    const bottomGradient = ctx.createLinearGradient(pipe.x, bottomPipeStart, pipe.x + pipeWidth, bottomPipeStart);
    bottomGradient.addColorStop(0, '#5aa844');
    bottomGradient.addColorStop(0.5, '#3d8a37');
    bottomGradient.addColorStop(1, '#2d6621');
    ctx.fillStyle = bottomGradient;
    ctx.fillRect(pipe.x, bottomPipeStart, pipeWidth, bottomPipeHeight);

    // Bottom pipe outline and highlight
    ctx.strokeStyle = '#1e4c16';
    ctx.lineWidth = 4;
    ctx.strokeRect(pipe.x, bottomPipeStart, pipeWidth, bottomPipeHeight);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(pipe.x + 2, bottomPipeStart + 2, pipeWidth - 4, bottomPipeHeight * 0.15);

    // Bottom pipe cap
    ctx.fillStyle = '#2d5c1d';
    ctx.fillRect(pipe.x - 6, bottomPipeStart, pipeWidth + 12, 6);
    ctx.strokeStyle = '#1e3c0d';
    ctx.lineWidth = 2;
    ctx.strokeRect(pipe.x - 6, bottomPipeStart, pipeWidth + 12, 6);

    // Pipe texture lines
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    for (let y = 0; y < topPipeHeight; y += 12) {
      ctx.beginPath();
      ctx.moveTo(pipe.x, y);
      ctx.lineTo(pipe.x + pipeWidth, y);
      ctx.stroke();
    }
    for (let y = bottomPipeStart; y < bottomPipeStart + bottomPipeHeight; y += 12) {
      ctx.beginPath();
      ctx.moveTo(pipe.x, y);
      ctx.lineTo(pipe.x + pipeWidth, y);
      ctx.stroke();
    }
  });
}

function drawBird() {
  const rotation = Math.max(-0.5, Math.min(0.9, bird.vy * 0.05));
  const wingOffsets = [0, -2, -3, -2];
  const wingOffset = wingOffsets[bird.wingFrame];

  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(rotation);

  // Bird shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.beginPath();
  ctx.ellipse(0, 6, birdRadius + 2, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Main body with gradient
  const bodyGradient = ctx.createRadialGradient(0, -2, 2, 0, 0, birdRadius);
  bodyGradient.addColorStop(0, '#ffe94c');
  bodyGradient.addColorStop(1, '#ffd53e');
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.arc(0, 0, birdRadius, 0, Math.PI * 2);
  ctx.fill();

  // Feather detail on body
  ctx.strokeStyle = 'rgba(255, 180, 0, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, birdRadius - 2, 0, Math.PI * 2);
  ctx.stroke();

  // Head (orange)
  const headGradient = ctx.createRadialGradient(8, -12, 1, 8, -10, 10);
  headGradient.addColorStop(0, '#ffa844');
  headGradient.addColorStop(1, '#ff8b15');
  ctx.fillStyle = headGradient;
  ctx.beginPath();
  ctx.arc(10, -10, 10, 0, Math.PI * 2);
  ctx.fill();

  // Eye white
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(6, -9, 5, 0, Math.PI * 2);
  ctx.fill();

  // Eye iris
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(5, -8, 3, 0, Math.PI * 2);
  ctx.fill();

  // Eye pupil shine
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(7, -10, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = '#ff6b2c';
  ctx.beginPath();
  ctx.moveTo(16, -8);
  ctx.lineTo(26, -6);
  ctx.lineTo(16, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#e5591f';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Wing with animation
  ctx.fillStyle = '#ffb844';
  ctx.beginPath();
  ctx.ellipse(20, 1 + wingOffset, 16, 10, 0.25, 0, Math.PI * 2);
  ctx.fill();

  // Wing detail
  ctx.strokeStyle = 'rgba(255, 150, 0, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(20, 1 + wingOffset, 14, 8, 0.25, 0, Math.PI * 2);
  ctx.stroke();

  // Tail feathers
  ctx.fillStyle = '#ffd86d';
  ctx.beginPath();
  ctx.moveTo(-8, -3 + wingOffset);
  ctx.lineTo(-22, -12 + wingOffset);
  ctx.lineTo(-18, 10 + wingOffset);
  ctx.closePath();
  ctx.fill();

  // Tail outline
  ctx.strokeStyle = '#ffb844';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Chest highlight
  ctx.fillStyle = 'rgba(255, 240, 100, 0.4)';
  ctx.beginPath();
  ctx.ellipse(-2, -2, 8, 12, 0, 0, Math.PI * 2);
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
  drawBackgroundLayers();
  drawGridLines();
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
createStars();
createGrass();
createBackgroundShapes();
createDecorations();
resetGame();
requestAnimationFrame(gameLoop);
