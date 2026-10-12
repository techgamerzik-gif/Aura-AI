import React, { useEffect, useRef } from 'react';

interface AuraOrbProps {
  state: 'idle' | 'listening' | 'thinking' | 'speaking';
  size?: 'sm' | 'md' | 'lg' | 'hero';
  className?: string;
  onClick?: () => void;
}

export const AuraOrb: React.FC<AuraOrbProps> = ({
  state,
  size = 'md',
  className = '',
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Pixel dimensions based on size
  const pxSize =
    size === 'hero' ? 240 : size === 'lg' ? 160 : size === 'md' ? 96 : 48;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let step = 0;

    const render = () => {
      step += 0.04;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = (canvas.width / 2) * 0.42;

      // Color palettes by state
      let primaryColor = 'rgba(56, 189, 248, ';   // Cyan
      let secondaryColor = 'rgba(129, 140, 248, '; // Indigo
      let glowColor = 'rgba(14, 165, 233, 0.4)';

      if (state === 'listening') {
        primaryColor = 'rgba(52, 211, 153, ';    // Emerald/Mint
        secondaryColor = 'rgba(56, 189, 248, ';  // Cyan
        glowColor = 'rgba(16, 185, 129, 0.5)';
      } else if (state === 'thinking') {
        primaryColor = 'rgba(168, 85, 247, ';    // Purple
        secondaryColor = 'rgba(236, 72, 153, ';  // Pink
        glowColor = 'rgba(147, 51, 234, 0.5)';
      } else if (state === 'speaking') {
        primaryColor = 'rgba(245, 158, 11, ';    // Amber/Gold
        secondaryColor = 'rgba(239, 68, 68, ';   // Coral
        glowColor = 'rgba(245, 158, 11, 0.5)';
      }

      // Outer Glow
      const glowGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        baseRadius * 0.3,
        centerX,
        centerY,
        baseRadius * 1.8
      );
      glowGrad.addColorStop(0, glowColor);
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Audio-reactive wave rings (3 nested undulating layers)
      const numRings = state === 'speaking' || state === 'listening' ? 4 : 2;
      for (let r = 0; r < numRings; r++) {
        ctx.beginPath();
        const ringOffset = (r * Math.PI) / numRings;
        const ringSpeed = state === 'speaking' ? 2.5 : state === 'listening' ? 1.8 : 1.0;
        const points = 64;

        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;
          // Harmonic wave distortion
          const waveFreq = state === 'speaking' ? 6 : state === 'listening' ? 4 : 3;
          const waveAmp =
            state === 'speaking'
              ? Math.sin(step * ringSpeed + angle * waveFreq + ringOffset) * (baseRadius * 0.18)
              : state === 'listening'
              ? Math.sin(step * ringSpeed + angle * waveFreq + ringOffset) * (baseRadius * 0.12)
              : Math.sin(step * 0.8 + angle * 2) * (baseRadius * 0.05);

          const radius = baseRadius * (0.85 + r * 0.15) + waveAmp;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.closePath();
        ctx.lineWidth = 1.5;
        const alpha = (0.7 - r * 0.15).toFixed(2);
        ctx.strokeStyle = `${r % 2 === 0 ? primaryColor : secondaryColor}${alpha})`;
        ctx.stroke();
      }

      // Core Holographic Sphere
      const coreGrad = ctx.createRadialGradient(
        centerX - baseRadius * 0.2,
        centerY - baseRadius * 0.2,
        baseRadius * 0.05,
        centerX,
        centerY,
        baseRadius * 0.8
      );
      coreGrad.addColorStop(0, `${primaryColor}0.9)`);
      coreGrad.addColorStop(0.5, `${secondaryColor}0.6)`);
      coreGrad.addColorStop(1, 'rgba(15, 23, 42, 0.8)');

      ctx.beginPath();
      const corePulse =
        state === 'speaking'
          ? Math.sin(step * 4) * 4
          : state === 'listening'
          ? Math.sin(step * 3) * 3
          : Math.sin(step) * 2;
      ctx.arc(centerX, centerY, baseRadius * 0.65 + corePulse, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();

      // Orbital Satellites / Quantum Sparkles
      const numOrbits = 3;
      for (let o = 0; o < numOrbits; o++) {
        const orbitAngle = step * (1.2 + o * 0.4) + (o * Math.PI * 2) / numOrbits;
        const orbitDist = baseRadius * (1.1 + o * 0.2);
        const satX = centerX + Math.cos(orbitAngle) * orbitDist;
        const satY = centerY + Math.sin(orbitAngle) * (orbitDist * 0.4); // elliptical

        ctx.beginPath();
        ctx.arc(satX, satY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `${primaryColor}0.9)`;
        ctx.shadowColor = `${primaryColor}1)`;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state, pxSize]);

  return (
    <div
      onClick={onClick}
      className={`relative flex items-center justify-center cursor-pointer select-none group ${className}`}
      title={`AURA Status: ${state.toUpperCase()}`}
    >
      <canvas
        ref={canvasRef}
        width={pxSize * 2}
        height={pxSize * 2}
        style={{ width: `${pxSize}px`, height: `${pxSize}px` }}
        className="transition-transform duration-300 group-hover:scale-105"
      />
    </div>
  );
};
