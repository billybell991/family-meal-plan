"use client";

import { useEffect, useRef, useCallback } from "react";
import { saveHighScore, getHighScore } from "../../lib/games";

// ─── Asteroid Belt — Asteroids clone ─────────────────────────────────────────
const CW = 360;
const CH = 480;
const SHIP_SIZE = 14;
const BULLET_SPEED = 6;
const BULLET_LIFE = 55;
const FRICTION = 0.98;
const THRUST = 0.18;
const TURN_SPEED = 0.07;
const MAX_SPEED = 5;

function randAsteroid(size, x, y) {
  const r = size === "big" ? 36 : size === "med" ? 20 : 11;
  const pts = [];
  const numPts = 8 + Math.floor(Math.random() * 5);
  for (let i = 0; i < numPts; i++) {
    const a = (i / numPts) * Math.PI * 2;
    const rr = r * (0.7 + Math.random() * 0.6);
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  const ax = x ?? (Math.random() > 0.5 ? Math.random() * CW * 0.3 : CW * 0.7 + Math.random() * CW * 0.3);
  const ay = y ?? (Math.random() > 0.5 ? Math.random() * CH * 0.3 : CH * 0.7 + Math.random() * CH * 0.3);
  const speed = size === "big" ? 0.6 + Math.random() * 0.6 : size === "med" ? 1 + Math.random() * 0.8 : 1.5 + Math.random() * 1.2;
  const angle = Math.random() * Math.PI * 2;
  return { x: ax, y: ay, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r, pts, angle: 0, spin: (Math.random() - 0.5) * 0.03 };
}

const STAR_BG = Array.from({ length: 70 }, () => ({
  x: Math.random() * CW,
  y: Math.random() * CH,
  r: Math.random() * 1.5 + 0.3,
}));

function makeGS() {
  const asteroids = [];
  for (let i = 0; i < 4; i++) asteroids.push(randAsteroid("big"));
  return {
    phase: "idle",
    ship: { x: CW / 2, y: CH / 2, vx: 0, vy: 0, angle: -Math.PI / 2, invincible: 180 },
    bullets: [],
    asteroids,
    particles: [],
    score: 0,
    lives: 3,
    level: 1,
    thrust: false,
    shooting: false,
    shootCooldown: 0,
  };
}

function explodeAsteroid(a, score) {
  const newAsteroids = [];
  const particles = [];
  if (a.r >= 30) { // big → 2 med
    newAsteroids.push(randAsteroid("med", a.x, a.y));
    newAsteroids.push(randAsteroid("med", a.x, a.y));
    score += 20;
  } else if (a.r >= 15) { // med → 2 small
    newAsteroids.push(randAsteroid("small", a.x, a.y));
    newAsteroids.push(randAsteroid("small", a.x, a.y));
    score += 50;
  } else {
    score += 100;
  }
  for (let i = 0; i < 8; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 0.8 + Math.random() * 1.5;
    particles.push({ x: a.x, y: a.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 30 + Math.random() * 30, color: "#f8a040" });
  }
  return { asteroids: newAsteroids, particles, score };
}

function wrap(v, max) { return ((v % max) + max) % max; }

// ─── Draw ─────────────────────────────────────────────────────────────────────
function drawAll(ctx, gs, hs) {
  ctx.fillStyle = "#050512";
  ctx.fillRect(0, 0, CW, CH);

  for (const s of STAR_BG) {
    ctx.fillStyle = `rgba(255,255,255,${0.3 + s.r * 0.3})`;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
  }

  for (const a of gs.asteroids) {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.angle);
    ctx.strokeStyle = "#c08060";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a.pts[0][0], a.pts[0][1]);
    for (let i = 1; i < a.pts.length; i++) ctx.lineTo(a.pts[i][0], a.pts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = "#f8e060";
  for (const b of gs.bullets) {
    ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
  }

  for (const p of gs.particles) {
    const alpha = p.life / 60;
    ctx.fillStyle = `rgba(248,160,64,${alpha})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
  }

  if (gs.phase === "playing") {
    const { ship } = gs;
    const visible = ship.invincible === 0 || Math.floor(ship.invincible / 6) % 2 === 0;
    if (visible) {
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.angle);
      ctx.strokeStyle = "#80c0ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(SHIP_SIZE, 0);
      ctx.lineTo(-SHIP_SIZE * 0.7, -SHIP_SIZE * 0.55);
      ctx.lineTo(-SHIP_SIZE * 0.4, 0);
      ctx.lineTo(-SHIP_SIZE * 0.7, SHIP_SIZE * 0.55);
      ctx.closePath();
      ctx.stroke();
      if (gs.thrust) {
        ctx.strokeStyle = "#f87020";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-SHIP_SIZE * 0.4, -4);
        ctx.lineTo(-SHIP_SIZE * 0.85 - Math.random() * 6, 0);
        ctx.lineTo(-SHIP_SIZE * 0.4, 4);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  ctx.font = "bold 11px monospace";
  ctx.textAlign = "left";
  ctx.fillStyle = "#80c0ff";
  ctx.fillText(`SCORE  ${gs.score}`, 8, 18);
  ctx.fillStyle = "#f08080";
  ctx.fillText(`❤️ ${gs.lives}`, 200, 18);
  ctx.fillStyle = "#f8e060";
  ctx.fillText(`BEST  ${hs}`, 260, 18);
  ctx.fillStyle = "#a080ff";
  ctx.fillText(`LVL ${gs.level}`, 8, CH - 8);

  if (gs.phase !== "playing") {
    ctx.fillStyle = "rgba(5,5,20,0.78)";
    ctx.fillRect(0, 0, CW, CH);
    ctx.textAlign = "center";
    if (gs.phase === "idle") {
      ctx.fillStyle = "#80c0ff";
      ctx.font = "bold 24px monospace";
      ctx.fillText("ASTEROID BELT", CW / 2, CH / 2 - 40);
      ctx.fillStyle = "#a0d0ff";
      ctx.font = "10px monospace";
      ctx.fillText("← → rotate  ·  ↑ thrust  ·  Space shoot", CW / 2, CH / 2 - 12);
      ctx.fillStyle = "#e0f0ff";
      ctx.fillText("[ PRESS  ANY  KEY ]", CW / 2, CH / 2 + 14);
    } else {
      ctx.fillStyle = "#f84060";
      ctx.font = "bold 22px monospace";
      ctx.fillText("DESTROYED!", CW / 2, CH / 2 - 34);
      ctx.fillStyle = "#f8e060";
      ctx.font = "bold 13px monospace";
      ctx.fillText(`Score: ${gs.score}`, CW / 2, CH / 2 - 6);
      ctx.fillStyle = "#80c0ff";
      ctx.font = "10px monospace";
      ctx.fillText("[ TAP / ANY KEY ]", CW / 2, CH / 2 + 16);
    }
    ctx.textAlign = "left";
  }
}

export default function AsteroidBelt() {
  const canvasRef = useRef(null);
  const gsRef = useRef(makeGS());
  const hsRef = useRef(0);
  const rafRef = useRef(0);
  const keysRef = useRef(new Set());

  const restart = useCallback(() => {
    gsRef.current = makeGS();
    gsRef.current.phase = "playing";
  }, []);

  useEffect(() => {
    hsRef.current = getHighScore("asteroid-belt");
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function loop() {
      const gs = gsRef.current;
      const keys = keysRef.current;

      if (gs.phase === "playing") {
        gs.thrust = keys.has("ArrowUp") || keys.has("KeyW");
        if (keys.has("ArrowLeft") || keys.has("KeyA")) gs.ship.angle -= TURN_SPEED;
        if (keys.has("ArrowRight") || keys.has("KeyD")) gs.ship.angle += TURN_SPEED;

        if (gs.thrust) {
          gs.ship.vx += Math.cos(gs.ship.angle) * THRUST;
          gs.ship.vy += Math.sin(gs.ship.angle) * THRUST;
        }
        gs.ship.vx *= FRICTION;
        gs.ship.vy *= FRICTION;
        const spd = Math.hypot(gs.ship.vx, gs.ship.vy);
        if (spd > MAX_SPEED) { gs.ship.vx *= MAX_SPEED / spd; gs.ship.vy *= MAX_SPEED / spd; }
        gs.ship.x = wrap(gs.ship.x + gs.ship.vx, CW);
        gs.ship.y = wrap(gs.ship.y + gs.ship.vy, CH);
        if (gs.ship.invincible > 0) gs.ship.invincible--;

        if (gs.shootCooldown > 0) gs.shootCooldown--;
        if ((keys.has("Space") || gs.shooting) && gs.shootCooldown === 0) {
          gs.bullets.push({
            x: gs.ship.x + Math.cos(gs.ship.angle) * SHIP_SIZE,
            y: gs.ship.y + Math.sin(gs.ship.angle) * SHIP_SIZE,
            vx: Math.cos(gs.ship.angle) * BULLET_SPEED + gs.ship.vx,
            vy: Math.sin(gs.ship.angle) * BULLET_SPEED + gs.ship.vy,
            life: BULLET_LIFE,
          });
          gs.shootCooldown = 10;
        }

        gs.bullets = gs.bullets.filter((b) => b.life > 0);
        for (const b of gs.bullets) { b.x = wrap(b.x + b.vx, CW); b.y = wrap(b.y + b.vy, CH); b.life--; }

        for (const a of gs.asteroids) { a.x = wrap(a.x + a.vx, CW); a.y = wrap(a.y + a.vy, CH); a.angle += a.spin; }

        const deadBullets = new Set();
        const deadAsteroids = new Set();
        const newAsteroids = [];

        for (const b of gs.bullets) {
          for (const a of gs.asteroids) {
            if (deadAsteroids.has(a)) continue;
            if (Math.hypot(b.x - a.x, b.y - a.y) < a.r) {
              deadBullets.add(b);
              deadAsteroids.add(a);
              const { asteroids: na, particles, score } = explodeAsteroid(a, gs.score);
              gs.score = score;
              newAsteroids.push(...na);
              gs.particles.push(...particles);
            }
          }
        }
        gs.bullets = gs.bullets.filter((b) => !deadBullets.has(b));
        gs.asteroids = [...gs.asteroids.filter((a) => !deadAsteroids.has(a)), ...newAsteroids];

        if (gs.ship.invincible === 0) {
          for (const a of gs.asteroids) {
            if (Math.hypot(gs.ship.x - a.x, gs.ship.y - a.y) < a.r + SHIP_SIZE * 0.6) {
              gs.lives--;
              gs.ship.invincible = 180;
              if (gs.lives <= 0) {
                gs.phase = "dead";
                saveHighScore("asteroid-belt", gs.score);
                hsRef.current = getHighScore("asteroid-belt");
              }
              break;
            }
          }
        }

        gs.particles = gs.particles.filter((p) => p.life > 0);
        for (const p of gs.particles) { p.x += p.vx; p.y += p.vy; p.life--; }

        if (gs.asteroids.length === 0) {
          gs.level++;
          const count = 3 + gs.level;
          for (let i = 0; i < count; i++) gs.asteroids.push(randAsteroid("big"));
        }
      }

      drawAll(ctx, gs, hsRef.current);
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    const onKey = (e) => {
      keysRef.current.add(e.code);
      const gs = gsRef.current;
      if (gs.phase !== "playing") restart();
    };
    const onKeyUp = (e) => keysRef.current.delete(e.code);

    const onPointerDown = () => {
      if (gsRef.current.phase !== "playing") { restart(); return; }
      gsRef.current.shooting = true;
    };
    const onPointerUp = () => { gsRef.current.shooting = false; };

    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
    };
  }, [restart]);

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        className="rounded-2xl border-2 border-white/20 shadow-2xl max-w-full"
        style={{ touchAction: "none" }}
      />
      <p className="text-xs text-white/50">← → rotate · ↑ thrust · Space to shoot · tap to start</p>
    </div>
  );
}
