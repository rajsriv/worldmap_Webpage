// --- Perlin Noise Implementation (2D) ---
function perlin(x, y) {
  function grad(ix, iy) {
    let s = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453;
    return [Math.cos(s), Math.sin(s)];
  }
  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  let x0 = Math.floor(x), y0 = Math.floor(y);
  let x1 = x0 + 1, y1 = y0 + 1;
  let sx = fade(x - x0), sy = fade(y - y0);

  let g00 = grad(x0, y0), g10 = grad(x1, y0), g01 = grad(x0, y1), g11 = grad(x1, y1);
  let dx = x - x0, dy = y - y0;
  let dot00 = g00[0]*dx     + g00[1]*dy;
  let dot10 = g10[0]*(dx-1) + g10[1]*dy;
  let dot01 = g01[0]*dx     + g01[1]*(dy-1);
  let dot11 = g11[0]*(dx-1) + g11[1]*(dy-1);

  let lerpX0 = dot00 + sx * (dot10 - dot00);
  let lerpX1 = dot01 + sx * (dot11 - dot01);
  return lerpX0 + sy * (lerpX1 - lerpX0);
}

document.addEventListener('DOMContentLoaded', function () {
  // HERO SECTION ANIMATION
  const section = document.getElementById('hero-section');
  if (!section) return;
  const bg = section.querySelector('.hero-bg-reveal');
  const canvas = document.getElementById('hero-dither-canvas');
  if (!canvas || !bg) return;
  const ctx = canvas.getContext('2d');

  // WORLD MAP MASK
  const maskImg = new window.Image();
  maskImg.src = 'world.svg';
  let maskCanvas = document.createElement('canvas');
  let maskCtx = maskCanvas.getContext('2d');
  let maskReady = false;

  function updateMaskCanvas() {
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    maskCtx.drawImage(maskImg, 0, 0, maskCanvas.width, maskCanvas.height);
    maskReady = true;
  }
  maskImg.onload = function() {
    updateMaskCanvas();
  };

  function resizeCanvas() {
    canvas.width = bg.offsetWidth;
    canvas.height = bg.offsetHeight;
    updateMaskCanvas();
    initGrid();
  }
  window.addEventListener('resize', resizeCanvas);

  // LED grid state
  const dotSpacing = 8;
  let ledStates = [];
  let gridW = 0, gridH = 0;

  function initGrid() {
    gridW = Math.ceil(canvas.width / dotSpacing);
    gridH = Math.ceil(canvas.height / dotSpacing);
    ledStates = [];
    for (let y = 0; y < gridH; y++) {
      let row = [];
      for (let x = 0; x < gridW; x++) {
        row.push({ value: 0, target: 0 });
      }
      ledStates.push(row);
    }
  }
  initGrid();

  // HOVER REVEAL STATE
  let mouseX = null, mouseY = null, isHovering = false;
  const lensRadius = 200; // larger lens radius
  section.addEventListener('mousemove', function(e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    isHovering = true;
  });
  section.addEventListener('mouseleave', function() {
    isHovering = false;
    mouseX = null;
    mouseY = null;
  });

  // DITHER PARAMETERES
  const ditherThresholds = [0.1, 0.3, 0.5, 0.7];
  const noiseScale = 0.012;

  // ADD WAVE REVEAL STATE
  let revealWaveActive = false;
  let revealWaveRadius = 0;
  let revealWaveMax = 0;
  let revealWaveCenter = {x: 0, y: 0};
  let revealWaveSpeed = 0;
  let revealWaveDone = false;
  let lensRadiusCurrent = lensRadius;
  let lensRadiusSmall = 80;

  // Find the button and set up click handler
  const ctaBtn = document.querySelector('.hero-cta');
  if (ctaBtn) {
    ctaBtn.addEventListener('click', function(e) {
      e.preventDefault(); // Prevent auto scroll
      // Get button center relative to canvas
      const btnRect = ctaBtn.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      revealWaveCenter.x = btnRect.left + btnRect.width / 2 - canvasRect.left;
      revealWaveCenter.y = btnRect.top + btnRect.height / 2 - canvasRect.top;
      revealWaveRadius = 0;
      revealWaveMax = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height);
      revealWaveSpeed = Math.max(canvas.width, canvas.height) / 18;
      revealWaveActive = true;
      revealWaveDone = false;
      // Disable lens/hover effect during reveal
      isHovering = false;
      mouseX = null;
      mouseY = null;
      lensRadiusCurrent = lensRadiusSmall;
      ctaBtn.classList.add('revealed');
      document.body.classList.remove('noscroll');

      // Trigger hyperspace effect
      forceHyperspace = true;
      forceHyperspaceProgress = 0;
      forceHyperspaceStart = null;
    });
  }

  let forceHyperspace = false;
  let forceHyperspaceProgress = 0;
  let forceHyperspaceStart = null;
  let forceHyperspaceDuration = 1200; // ms

  function getHyperspaceStretch() {
    if (forceHyperspace) {
      return forceHyperspaceProgress;
    }
    // Get scroll position relative to hero section
    const hero = document.getElementById('hero-section');
    if (!hero) return 0;
    const rect = hero.getBoundingClientRect();
    const windowH = window.innerHeight;
    // When hero bottom is above the top of the viewport, full stretch
    if (rect.bottom < 0) return 1;
    // When hero top is below the top of the viewport, no stretch
    if (rect.top > 0) return 0;
    // Otherwise, interpolate based on how much is out of view
    const stretch = Math.min(1, Math.max(0, -rect.top / windowH));
    // Apply cubic ease for smoothness
    return Math.pow(stretch, 3);
  }

  function animate(time) {
    const w = canvas.width, h = canvas.height;
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    // Hyperspace stretch factor (0 = dots, 1 = full lines)
    const stretch = getHyperspaceStretch();
    // Center for radial effect
    const cx = w / 2;
    const cy = h / 2;
    const maxLineLen = Math.max(w, h) * 0.7;

    // WAVE REVEAL LOGIC
    let revealMask = null;
    if (revealWaveActive) {
      revealWaveRadius += revealWaveSpeed;
      if (revealWaveRadius >= revealWaveMax) {
        revealWaveActive = false;
        revealWaveDone = true;
      }
      // Create a mask function for the wave
      revealMask = (x, y) => {
        const dx = x - revealWaveCenter.x;
        const dy = y - revealWaveCenter.y;
        return Math.sqrt(dx * dx + dy * dy) < revealWaveRadius;
      };
    } else if (revealWaveDone) {
      // After reveal, everything is visible
      revealMask = () => true;
    }

    // --- Color distortion/aberration (3D anaglyph) effect ---
    const anaglyph = [
      {dx: 0, dy: 0, color: 'rgba(255,255,255,1)'},   // white center
      {dx: -1, dy: 0, color: 'rgba(255,0,0,0.7)'},    // red
      {dx: 1, dy: 0, color: 'rgba(0,255,255,0.7)'},  // cyan
      {dx: 0, dy: 1, color: 'rgba(0,0,255,0.7)'}     // blue
    ];

    // --- Draw dithered dots with mask (normal, non-magnified) ---
    for (let gy = 0; gy < gridH; gy++) {
      for (let gx = 0; gx < gridW; gx++) {
        let x = gx * dotSpacing;
        let y = gy * dotSpacing;
        // --- Mask check ---
        let drawDot = false;
        if (maskReady) {
          let mx = Math.floor((x / w) * maskCanvas.width);
          let my = Math.floor((y / h) * maskCanvas.height);
          let maskData = maskCtx.getImageData(mx, my, 1, 1).data;
          if (maskData[3] > 128) {
            drawDot = true;
          }
        } else {
          drawDot = true;
        }
        // --- Dithered effect ---
        let n = perlin(x * noiseScale, y * noiseScale);
        n = (n + 1) / 2;
        let density = perlin((x + 1000) * 0.002, (y + 1000) * 0.002);
        density = (density + 1) / 2;
        density = 0.5 + 0.5 * Math.sin(density * Math.PI);
        for (let d of ditherThresholds) {
          if (n > d) drawDot = drawDot && true;
        }
        let led = ledStates[gy][gx];
        // --- Hover light logic ---
        let target = 0;
        if (!revealWaveActive && !revealWaveDone && isHovering && mouseX !== null && mouseY !== null) {
          let dist = Math.sqrt((x - mouseX) * (x - mouseX) + (y - mouseY) * (y - mouseY));
          if (dist < lensRadius) {
            let edgeFade = 1 - (dist / lensRadius);
            target = Math.pow(edgeFade, 1.5);
          }
        } else if (revealMask) {
          // During/after reveal, all dots in the wave are fully lit
          if (revealMask(x, y)) target = 1;
        }
        led.target = target;
        led.value = led.target;
        // Remove trail: set value directly to target, no easing
        // led.target *= 0.83; // remove decay
        // Draw (skip if in magnified region, will be drawn later)
        let inLens = isHovering && mouseX !== null && mouseY !== null && Math.sqrt((x - mouseX) * (x - mouseX) + (y - mouseY) * (y - mouseY)) < lensRadiusCurrent;
        if (drawDot && led.value > 0.01 && !inLens) {
          let baseAlpha = 0.8 * density;
          let alpha = baseAlpha + led.value * (1 - baseAlpha);
          ctx.globalAlpha = alpha;
          ctx.fillStyle = '#fff';
          if (stretch > 0) {
            // Only stretch a subset of dots for performance (e.g., every 3rd dot)
            // Use a simple hash for a more organic look
            const hash = (gx * 92821 + gy * 68917) % 5;
            if (hash === 0) {
              // Radial hyperspace: draw a line from (x, y) outward from center
              const dx = x - cx;
              const dy = y - cy;
              const len = Math.sqrt(dx * dx + dy * dy);
              const norm = len === 0 ? [0, 0] : [dx / len, dy / len];
              const lineLen = stretch * maxLineLen;
              // Fade the line as it gets longer
              const fade = 1 - 0.7 * stretch;
              ctx.save();
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(x + norm[0] * lineLen, y + norm[1] * lineLen);
              ctx.lineWidth = 2 - stretch * 1.2; // thinner at max stretch
              ctx.strokeStyle = `rgba(255,255,255,${fade})`;
              ctx.stroke();
              ctx.restore();
            } else {
              ctx.beginPath();
              ctx.arc(x, y, 1.2, 0, 2 * Math.PI);
              ctx.fill();
            }
          } else {
            ctx.beginPath();
            ctx.arc(x, y, 1.2, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      }
    }
    ctx.globalAlpha = 1;

    // --- Magnifying glass effect with smooth radial magnification (fisheye lens) ---
    if (isHovering && mouseX !== null && mouseY !== null) {
      const mag = 1.5; // magnification factor
      const lensX = mouseX;
      const lensY = mouseY;
      const lensR = lensRadiusCurrent;
      for (let gy = 0; gy < gridH; gy++) {
        for (let gx = 0; gx < gridW; gx++) {
          let x = gx * dotSpacing;
          let y = gy * dotSpacing;
          let dx = x - lensX;
          let dy = y - lensY;
          let dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < lensR) {
            let t = dist / lensR;
            let blend = Math.pow(1 - t, 3);
            let mx = lensX + dx * (1 - blend) + dx * blend * mag;
            let my = lensY + dy * (1 - blend) + dy * blend * mag;
            // --- Mask check ---
            let drawDot = false;
            if (maskReady) {
              let mmx = Math.floor((mx / w) * maskCanvas.width);
              let mmy = Math.floor((my / h) * maskCanvas.height);
              let maskData = maskCtx.getImageData(mmx, mmy, 1, 1).data;
              if (maskData[3] > 128) {
                drawDot = true;
              }
            } else {
              drawDot = true;
            }
            // --- Dithered effect ---
            let n = perlin(mx * noiseScale, my * noiseScale);
            n = (n + 1) / 2;
            let density = perlin((mx + 1000) * 0.002, (my + 1000) * 0.002);
            density = (density + 1) / 2;
            density = 0.5 + 0.5 * Math.sin(density * Math.PI);
            for (let d of ditherThresholds) {
              if (n > d) drawDot = drawDot && true;
            }
            let led = ledStates[gy][gx];
            if (drawDot && led.value > 0.01) {
              let baseAlpha = 0.8 * density;
              let alpha = baseAlpha + led.value * (1 - baseAlpha);
              if (!revealWaveDone) {
                alpha *= Math.min(1, blend * 4);
              } else {
                alpha = 1;
              }
              ctx.globalAlpha = alpha;
              ctx.fillStyle = '#fff';
              ctx.beginPath();
              ctx.arc(mx, my, 1.2, 0, 2 * Math.PI);
              ctx.fill();
            }
          }
        }
      }
    }

    // After reveal, restore lens size and effect
    if (revealWaveDone && lensRadiusCurrent !== lensRadius) {
      lensRadiusCurrent = lensRadius;
    }

    ctx.globalAlpha = 1;
    // Fade in a white overlay as stretch approaches 1
    if (stretch > 0.7) {
      const overlayAlpha = Math.min(1, (stretch - 0.7) / 0.3);
      ctx.save();
      ctx.globalAlpha = overlayAlpha;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
    bg.style.webkitMaskImage = `url(${canvas.toDataURL()})`;
    bg.style.maskImage = `url(${canvas.toDataURL()})`;

    // Animate forced hyperspace effect
    if (forceHyperspace) {
      if (!forceHyperspaceStart) forceHyperspaceStart = time;
      let t = (time - forceHyperspaceStart) / forceHyperspaceDuration;
      forceHyperspaceProgress = Math.min(1, t);
      if (forceHyperspaceProgress >= 1) {
        // After a short delay, scroll to next section and reset effect
        setTimeout(() => {
          const allSections = Array.from(document.querySelectorAll('section'));
          const idx = allSections.findIndex(s => s.id === 'hero-section');
          if (idx !== -1 && allSections[idx + 1]) {
            allSections[idx + 1].scrollIntoView({ behavior: 'smooth' });
          }
          setTimeout(() => {
            forceHyperspace = false;
            forceHyperspaceProgress = 0;
            forceHyperspaceStart = null;
          }, 600);
        }, 400);
      }
    }
    requestAnimationFrame(animate);
  }
  animate();
  
  // === Liquid Blobs in Personal Blob Section ===
});

(function() {
  const section = document.getElementById('personal-blob-section');
  const canvas = document.getElementById('creature-canvas');
  if (!section || !canvas) return;
  const ctx = canvas.getContext('2d');

  let width = 0, height = 0;
  function resize() {
    width = section.offsetWidth;
    height = section.offsetHeight;
    canvas.width = width;
    canvas.height = height;
  }
  window.addEventListener('resize', resize);
  resize();

  // Creature state
  let mouse = { x: width/2, y: height/2 };
  let creature = {
    x: width/2,
    y: height/2,
    vx: 0,
    vy: 0,
    angle: 0,
    tail: Array.from({length: 18}, (_,i) => ({x: width/2, y: height/2, a: 0})),
    color: '#ffb300',
    bodyRadius: 32,
    tailLength: 18,
    tailWiggle: 0
  };

  section.addEventListener('mousemove', function(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  section.addEventListener('mouseleave', function() {
    mouse.x = width/2;
    mouse.y = height/2;
  });

  function lerp(a, b, t) { return a + (b - a) * t; }

  function animateCreature() {
    // Smoothly follow the mouse
    creature.vx = lerp(creature.vx, (mouse.x - creature.x) * 0.12, 0.2);
    creature.vy = lerp(creature.vy, (mouse.y - creature.y) * 0.12, 0.2);
    creature.x += creature.vx;
    creature.y += creature.vy;
    // Angle towards movement
    let dx = creature.vx, dy = creature.vy;
    creature.angle = Math.atan2(dy, dx);
    // Tail follows head
    let prev = {x: creature.x, y: creature.y, a: creature.angle};
    for (let i = 0; i < creature.tailLength; i++) {
      let t = creature.tail[i];
      let dist = Math.hypot(prev.x - t.x, prev.y - t.y);
      let targetAngle = Math.atan2(prev.y - t.y, prev.x - t.x);
      let wiggle = Math.sin(Date.now()/400 + i*0.5) * 0.25 * (1 - i/creature.tailLength);
      t.x = lerp(t.x, prev.x - Math.cos(targetAngle + wiggle) * 18, 0.4);
      t.y = lerp(t.y, prev.y - Math.sin(targetAngle + wiggle) * 18, 0.4);
      t.a = targetAngle + wiggle;
      prev = t;
    }
  }

  function drawCreature() {
    ctx.clearRect(0, 0, width, height);
    // Draw tail
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#ffb300';
    ctx.lineWidth = 16;
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.moveTo(creature.x, creature.y);
    for (let i = 0; i < creature.tailLength; i++) {
      ctx.lineTo(creature.tail[i].x, creature.tail[i].y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    // Draw body
    ctx.save();
    ctx.translate(creature.x, creature.y);
    ctx.rotate(creature.angle);
    ctx.fillStyle = creature.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, creature.bodyRadius * 1.1, creature.bodyRadius * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(10, -8, 7, 7, 0, 0, Math.PI * 2);
    ctx.ellipse(10, 8, 7, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.ellipse(13, -8, 3, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(13, 8, 3, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  function loop() {
    animateCreature();
    drawCreature();
    requestAnimationFrame(loop);
  }
  loop();
})(); 