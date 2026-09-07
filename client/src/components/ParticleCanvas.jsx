import React, { useEffect, useRef } from "react";

const PARTICLE_COUNT = 35;
const DARK_COLORS = ["108,92,231", "168,85,247", "236,72,153", "6,182,212"];
const LIGHT_COLORS = ["90,60,200", "140,60,220", "200,50,130", "0,140,180"];

export default function ParticleCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    let particles = [];

    function isLight() { return document.documentElement.getAttribute("data-theme") === "light"; }

    function getColors() { return isLight() ? LIGHT_COLORS : DARK_COLORS; }
    function getOpacity() { return isLight() ? 0.35 : 0.2; }

    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const colors = getColors();
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2.5 + 0.8,
        speedY: -(Math.random() * 0.3 + 0.1),
        speedX: (Math.random() - 0.5) * 0.15,
        opacity: Math.random() * getOpacity() + 0.08,
        oscillation: Math.random() * Math.PI * 2,
        oscillationSpeed: Math.random() * 0.01 + 0.005,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.y += p.speedY;
        p.oscillation += p.oscillationSpeed;
        p.x += p.speedX + Math.sin(p.oscillation) * 0.3;
        if (p.y < -10) { p.y = canvas.height + 10; p.x = Math.random() * canvas.width; }
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + p.color + ", " + p.opacity + ")";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + p.color + ", " + (p.opacity * 0.15) + ")";
        ctx.fill();
      }
      animId = requestAnimationFrame(animate);
    }
    animate();

    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none" }} />;
}