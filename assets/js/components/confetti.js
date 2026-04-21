let canvas, ctx, particles, active, animFrame;

export function initConfetti() {
  canvas = document.getElementById('confetti-canvas');
  ctx = canvas.getContext('2d');
}

export function startConfetti() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = 'block';
  canvas.style.opacity = '1';

  particles = Array.from({ length: 110 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    size: 7 + Math.random() * 5,
    speedY: 2 + Math.random() * 3,
    speedX: (Math.random() - 0.5) * 2,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 10,
    color: `hsl(${Math.floor(Math.random() * 360)}, 88%, 60%)`,
    opacity: 1,
    life: 280,
  }));

  active = true;
  if (animFrame) cancelAnimationFrame(animFrame);
  loop();
}

export function stopConfetti() {
  if (!active || !canvas) return;
  canvas.style.transition = 'opacity 0.5s ease-out';
  canvas.style.opacity = '0';
  setTimeout(() => {
    active = false;
    particles = [];
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.display = 'none';
  }, 500);
}

export function resizeConfetti() {
  if (active && canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
}

function loop() {
  if (!active) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles.forEach(p => {
    p.x += p.speedX;
    p.y += p.speedY;
    p.rotation += p.rotationSpeed;
    p.life--;
    if (p.life < 20) p.opacity = p.life / 20;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((p.rotation * Math.PI) / 180);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.opacity;
    ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    ctx.restore();
  });

  particles = particles.filter(p => p.life > 0);

  if (particles.length === 0) {
    canvas.style.display = 'none';
    active = false;
  } else {
    animFrame = requestAnimationFrame(loop);
  }
}
