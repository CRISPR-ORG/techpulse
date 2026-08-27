import { useState, useEffect, useCallback } from 'react';
import './CustomCursor.css';

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [follower, setFollower] = useState({ x: -100, y: -100 });
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  const handleMouseMove = useCallback((e) => {
    setPosition({ x: e.clientX, y: e.clientY });
    document.documentElement.style.setProperty('--cursor-x', `${e.clientX}px`);
    document.documentElement.style.setProperty('--cursor-y', `${e.clientY}px`);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove]);

  useEffect(() => {
    document.documentElement.style.setProperty('--cursor-follower-x', `${follower.x}px`);
    document.documentElement.style.setProperty('--cursor-follower-y', `${follower.y}px`);
  }, [follower]);

  // Follower with lag
  useEffect(() => {
    let animFrame;
    const animate = () => {
      setFollower(prev => ({
        x: prev.x + (position.x - prev.x) * 0.15,
        y: prev.y + (position.y - prev.y) * 0.15,
      }));
      animFrame = requestAnimationFrame(animate);
    };
    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, [position]);

  // Detect hoverable elements
  useEffect(() => {
    const handleHoverDetect = (e) => {
      const target = e.target;
      const isLink = target.tagName === 'A' || target.tagName === 'BUTTON' ||
        target.closest('a') || target.closest('button') ||
        target.classList.contains('card') || target.closest('.card') ||
        target.classList.contains('btn') || target.closest('.btn') ||
        target.classList.contains('nav-link') || target.closest('.nav-link');
      setIsHovering(!!isLink);
    };
    window.addEventListener('mouseover', handleHoverDetect);
    return () => window.removeEventListener('mouseover', handleHoverDetect);
  }, []);

  // Don't render on touch devices
  if ('ontouchstart' in window) return null;

  return (
    <>
      {/* Main cursor — crosshair style */}
      <div
        className={`cursor-main ${isClicking ? 'clicking' : ''} ${isHovering ? 'hovering' : ''}`}
        style={{ left: position.x, top: position.y }}
      >
        <div className="cursor-cross-h" />
        <div className="cursor-cross-v" />
        <div className="cursor-dot" />
      </div>

      {/* Follower ring */}
      <div
        className={`cursor-follower ${isHovering ? 'hovering' : ''} ${isClicking ? 'clicking' : ''}`}
        style={{ left: follower.x, top: follower.y }}
      />

      {/* Coordinate readout */}
      <div
        className="cursor-coords"
        style={{ left: position.x + 20, top: position.y + 20 }}
      >
        {Math.round(position.x)},{Math.round(position.y)}
      </div>
    </>
  );
}
