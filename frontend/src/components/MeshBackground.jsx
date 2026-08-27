import { useEffect, useRef } from 'react';
import './MeshBackground.css';

const MOBILE_BREAKPOINT = 768;
const MAX_DEVICE_PIXEL_RATIO = 1.5;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function createNode(width, height, speedScale) {
  const angle = Math.random() * Math.PI * 2;
  const speed = (0.12 + Math.random() * 0.2) * speedScale;

  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    drift: 2 + Math.random() * 5,
    phase: Math.random() * Math.PI * 2,
    radius: 0.7 + Math.random() * 1.2,
  };
}

export default function MeshBackground() {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(0);
  const resizeFrameRef = useRef(0);
  const meshRef = useRef({
    context: null,
    width: 0,
    height: 0,
    connectionRadius: 150,
    influenceRadius: 180,
    nodes: [],
    pointer: {
      x: 0,
      y: 0,
      active: false,
      pressed: false,
      pulse: 0,
    },
  });

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    const context = canvas.getContext('2d');

    if (!context) {
      return undefined;
    }

    const state = meshRef.current;
    state.context = context;

    const setCursorVars = (x, y) => {
      document.documentElement.style.setProperty('--cursor-x', `${x}px`);
      document.documentElement.style.setProperty('--cursor-y', `${y}px`);
    };

    const resizeCanvas = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isCompact = width <= MOBILE_BREAKPOINT;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO);
      const spacing = isCompact ? 28500 : 22000;
      const nodeCount = clamp(Math.round((width * height) / spacing), isCompact ? 18 : 28, isCompact ? 30 : 52);

      state.width = width;
      state.height = height;
      state.connectionRadius = isCompact ? 118 : 152;
      state.influenceRadius = isCompact ? 120 : 176;
      state.nodes = Array.from({ length: nodeCount }, () => createNode(width, height, isCompact ? 0.82 : 1));

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      context.setTransform(1, 0, 0, 1, 0, 0);
      context.scale(dpr, dpr);
      context.lineCap = 'round';

      if (!state.pointer.active) {
        state.pointer.x = width * 0.5;
        state.pointer.y = height * 0.35;
        setCursorVars(state.pointer.x, state.pointer.y);
      }
    };

    const queueResize = () => {
      cancelAnimationFrame(resizeFrameRef.current);
      resizeFrameRef.current = requestAnimationFrame(resizeCanvas);
    };

    const handlePointerMove = (event) => {
      state.pointer.x = event.clientX;
      state.pointer.y = event.clientY;
      state.pointer.active = true;
      setCursorVars(event.clientX, event.clientY);
    };

    const handlePointerLeave = () => {
      state.pointer.active = false;
    };

    const handlePointerDown = () => {
      state.pointer.pressed = true;
      state.pointer.pulse = 1;
    };

    const handlePointerUp = () => {
      state.pointer.pressed = false;
    };

    const animate = (time) => {
      const {
        width,
        height,
        nodes,
        pointer,
        connectionRadius,
        influenceRadius,
      } = state;

      context.clearRect(0, 0, width, height);
      pointer.pulse *= 0.94;

      const positions = nodes.map((node) => {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x <= -24 || node.x >= width + 24) {
          node.vx *= -1;
        }

        if (node.y <= -24 || node.y >= height + 24) {
          node.vy *= -1;
        }

        let drawX = node.x + Math.sin(time * 0.00045 + node.phase) * node.drift;
        let drawY = node.y + Math.cos(time * 0.00035 + node.phase * 1.17) * node.drift;
        let intensity = 0;

        if (pointer.active) {
          const dx = pointer.x - drawX;
          const dy = pointer.y - drawY;
          const distance = Math.hypot(dx, dy) || 1;

          if (distance < influenceRadius) {
            const falloff = 1 - distance / influenceRadius;
            const attraction = pointer.pressed ? 24 : 14;
            const pulseLift = pointer.pulse * 26;
            const force = (falloff * falloff) * (attraction + pulseLift);

            drawX += (dx / distance) * force;
            drawY += (dy / distance) * force;
            intensity = falloff;
          }
        }

        return { x: drawX, y: drawY, radius: node.radius, intensity };
      });

      for (let index = 0; index < positions.length; index += 1) {
        const point = positions[index];

        for (let nextIndex = index + 1; nextIndex < positions.length; nextIndex += 1) {
          const otherPoint = positions[nextIndex];
          const dx = point.x - otherPoint.x;
          const dy = point.y - otherPoint.y;
          const distance = Math.hypot(dx, dy);

          if (distance >= connectionRadius) {
            continue;
          }

          const alpha = (1 - distance / connectionRadius) * 0.24 + Math.max(point.intensity, otherPoint.intensity) * 0.16;

          context.strokeStyle = `rgba(0, 255, 65, ${alpha})`;
          context.lineWidth = 0.7 + Math.max(point.intensity, otherPoint.intensity) * 0.45;
          context.beginPath();
          context.moveTo(point.x, point.y);
          context.lineTo(otherPoint.x, otherPoint.y);
          context.stroke();
        }
      }

      positions.forEach((point) => {
        const glow = 0.24 + point.intensity * 0.38;

        context.fillStyle = `rgba(120, 255, 156, ${glow})`;
        context.beginPath();
        context.arc(point.x, point.y, point.radius + point.intensity * 0.7, 0, Math.PI * 2);
        context.fill();
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();

    window.addEventListener('resize', queueResize);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseleave', handlePointerLeave);
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mouseup', handlePointerUp);

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      cancelAnimationFrame(resizeFrameRef.current);
      window.removeEventListener('resize', queueResize);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseleave', handlePointerLeave);
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('mouseup', handlePointerUp);
    };
  }, []);

  return (
    <div className="mesh-background" aria-hidden="true">
      <canvas ref={canvasRef} className="mesh-background__canvas" />
      <div className="mesh-background__glow" />
      <div className="mesh-background__grain" />
    </div>
  );
}
