'use strict';

const THEMES = {
  'pink-plum': {
    label: '粉色梅花',
    colors: ['#FF8AB3', '#FFD2DF', '#7D4DFF', '#FFF5F8'],
    mode: 'plum'
  },
  'violet-flow': {
    label: '蓝紫流光',
    colors: ['#7C5CFF', '#57C7FF', '#151A3D', '#E8E6FF'],
    mode: 'flow'
  },
  'golden-hour': {
    label: '暖金夕阳',
    colors: ['#FFB35C', '#FF6E62', '#713C88', '#FFF1C7'],
    mode: 'sunset'
  },
  'ocean-bubble': {
    label: '深海气泡',
    colors: ['#27C7D8', '#2377C7', '#072B4D', '#C7FBFF'],
    mode: 'bubbles'
  }
};

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function createPetal() {
  return {
    x: random(0, 1),
    y: random(-0.2, 1),
    size: random(8, 22),
    speed: random(0.00012, 0.00036),
    drift: random(0.00005, 0.00022),
    rotation: random(0, Math.PI * 2),
    spin: random(-0.001, 0.001),
    alpha: random(0.35, 0.9)
  };
}

function drawPetal(ctx, x, y, size, rotation, alpha, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(1, 0.72);
  const gradient = ctx.createLinearGradient(-size, -size, size, size);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, '#FFFFFF');
  ctx.fillStyle = gradient;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.bezierCurveTo(size * 0.9, -size * 0.75, size, size * 0.45, 0, size);
  ctx.bezierCurveTo(-size, size * 0.45, -size * 0.9, -size * 0.75, 0, -size);
  ctx.fill();
  ctx.restore();
}

function drawFlow(ctx, width, height, time, colors) {
  ctx.lineWidth = Math.max(22, width * 0.035);
  ctx.globalAlpha = 0.24;
  for (let index = 0; index < 6; index += 1) {
    const baseY = height * (0.12 + index * 0.15);
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, colors[index % 2]);
    gradient.addColorStop(0.5, colors[2]);
    gradient.addColorStop(1, colors[3]);
    ctx.strokeStyle = gradient;
    ctx.beginPath();
    for (let x = -50; x <= width + 50; x += 24) {
      const y = baseY + Math.sin(x * 0.006 + time * 0.00045 + index) * (55 + index * 8);
      if (x === -50) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawSunset(ctx, width, height, time, colors) {
  const glow = ctx.createRadialGradient(width * 0.78, height * 0.18, 0, width * 0.78, height * 0.18, width * 0.7);
  glow.addColorStop(0, colors[3]);
  glow.addColorStop(0.38, colors[0]);
  glow.addColorStop(1, colors[2]);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 2;
  for (let row = 0; row < 8; row += 1) {
    ctx.beginPath();
    for (let x = -20; x <= width + 20; x += 20) {
      const y = height * 0.52 + row * 34 + Math.sin(x * 0.008 + time * 0.00022 + row) * 12;
      if (x === -20) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function drawBubbles(ctx, width, height, time) {
  for (let index = 0; index < 28; index += 1) {
    const radius = 8 + (index % 7) * 8;
    const x = ((index * 97 + time * 0.018 * (1 + index % 3)) % (width + 160)) - 80;
    const y = height - ((index * 71 + time * 0.026) % (height + 180));
    const gradient = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.35, radius * 0.1, x, y, radius);
    gradient.addColorStop(0, 'rgba(255,255,255,0.62)');
    gradient.addColorStop(0.28, 'rgba(106,225,241,0.16)');
    gradient.addColorStop(1, 'rgba(51,163,225,0.02)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(222,253,255,0.25)';
    ctx.stroke();
  }
}

function initBackground(canvas, themeName = 'pink-plum') {
  const context = canvas.getContext('2d');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let activeTheme = THEMES[themeName] ? themeName : 'pink-plum';
  let petals = Array.from({ length: 46 }, createPetal);
  let frameId = 0;

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * ratio);
    canvas.height = Math.floor(window.innerHeight * ratio);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function render(time = 0) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const theme = THEMES[activeTheme];
    const base = context.createLinearGradient(0, 0, width, height);
    base.addColorStop(0, theme.colors[2]);
    base.addColorStop(0.48, theme.colors[0]);
    base.addColorStop(1, theme.colors[1]);
    context.fillStyle = base;
    context.fillRect(0, 0, width, height);

    if (theme.mode === 'plum') {
      context.fillStyle = 'rgba(255,255,255,0.12)';
      context.fillRect(0, 0, width, height);
      petals.forEach((petal) => {
        if (!reducedMotion) {
          petal.y += petal.speed * 16;
          petal.x += Math.sin(time * petal.drift + petal.y * 8) * 0.00065;
          petal.rotation += petal.spin;
          if (petal.y > 1.12) {
            petal.y = -0.12;
            petal.x = random(0, 1);
          }
        }
        drawPetal(context, petal.x * width, petal.y * height, petal.size, petal.rotation, petal.alpha, '#FF5D92');
      });
    } else if (theme.mode === 'flow') {
      drawFlow(context, width, height, reducedMotion ? 0 : time, theme.colors);
    } else if (theme.mode === 'sunset') {
      drawSunset(context, width, height, reducedMotion ? 0 : time, theme.colors);
    } else {
      drawBubbles(context, width, height, reducedMotion ? 0 : time);
    }

    const veil = context.createLinearGradient(0, 0, width, 0);
    veil.addColorStop(0, 'rgba(255,255,255,0.13)');
    veil.addColorStop(0.5, 'rgba(255,255,255,0)');
    veil.addColorStop(1, 'rgba(255,255,255,0.1)');
    context.fillStyle = veil;
    context.fillRect(0, 0, width, height);

    if (!reducedMotion) frameId = requestAnimationFrame(render);
  }

  resize();
  window.addEventListener('resize', resize);
  render();

  return {
    setTheme(nextTheme) {
      activeTheme = THEMES[nextTheme] ? nextTheme : 'pink-plum';
      if (reducedMotion) render();
    },
    destroy() {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
    }
  };
}

window.YishanBackgrounds = { THEMES, initBackground };
