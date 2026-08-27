import { useState, useEffect } from 'react';
import '../styles/loading.css';

const bootSequence = [
  { timestamp: '0.000000', text: 'TechPulse kernel v3.7.2 initializing...', status: '' },
  { timestamp: '0.041293', text: 'Loading campus modules...', status: 'OK' },
  { timestamp: '0.128571', text: 'Mounting /news/aggregator...', status: 'OK' },
  { timestamp: '0.214857', text: 'Connecting hackathon feeds...', status: 'OK' },
  { timestamp: '0.342109', text: 'Scanning internship database...', status: 'OK' },
  { timestamp: '0.428571', text: 'Initializing club networks...', status: 'OK' },
  { timestamp: '0.571429', text: 'Syncing social feeds...', status: 'OK' },
  { timestamp: '0.685714', text: 'Loading fest archives...', status: 'OK' },
  { timestamp: '0.785714', text: 'Campus pulse heartbeat detected...', status: 'OK' },
  { timestamp: '0.892143', text: 'Establishing secure connection...', status: 'OK' },
  { timestamp: '1.000000', text: 'Root access:', status: 'GRANTED' },
];

const asciiArt = `
████████╗███████╗ ██████╗██╗  ██╗██████╗ ██╗   ██╗██╗     ███████╗███████╗
╚══██╔══╝██╔════╝██╔════╝██║  ██║██╔══██╗██║   ██║██║     ██╔════╝██╔════╝
   ██║   █████╗  ██║     ███████║██████╔╝██║   ██║██║     ███████╗█████╗  
   ██║   ██╔══╝  ██║     ██╔══██║██╔═══╝ ██║   ██║██║     ╚════██║██╔══╝  
   ██║   ███████╗╚██████╗██║  ██║██║     ╚██████╔╝███████╗███████║███████╗
   ╚═╝   ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝      ╚═════╝ ╚══════╝╚══════╝╚══════╝
`;

export default function LoadingScreen({ onComplete }) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [showAscii, setShowAscii] = useState(false);
  const [showEnter, setShowEnter] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const totalDuration = 3000;
    const lineDelay = 120;
    const startTime = Date.now();

    // Progress bar
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / totalDuration) * 100, 100);
      setProgress(pct);
    }, 30);

    // Boot lines
    bootSequence.forEach((_, i) => {
      setTimeout(() => {
        setVisibleLines(i + 1);
      }, 200 + i * lineDelay);
    });

    // Show ASCII art
    setTimeout(() => {
      setShowAscii(true);
    }, 200 + bootSequence.length * lineDelay + 200);

    // Show enter message
    setTimeout(() => {
      setShowEnter(true);
    }, 200 + bootSequence.length * lineDelay + 600);

    // Fade out and complete
    setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => {
        onComplete();
      }, 500);
    }, totalDuration - 500);

    return () => clearInterval(progressInterval);
  }, [onComplete]);

  return (
    <div className={`loading-screen ${fadeOut ? 'fade-out' : ''}`}>
      {bootSequence.map((line, i) => (
        <div
          key={i}
          className={`boot-line ${i < visibleLines ? 'visible' : ''}`}
          style={{ transitionDelay: `${i * 0.02}s` }}
        >
          <span className="timestamp">[{' '.repeat(4 - line.timestamp.split('.')[0].length)}{line.timestamp}]</span>
          <span className="action">{line.text}</span>
          {line.status && (
            <span className={line.status === 'GRANTED' ? 'ok' : 'ok'}>
              {' '}{line.status}
            </span>
          )}
        </div>
      ))}

      <div className={`boot-ascii ${showAscii ? 'visible' : ''}`}>
        <pre>{asciiArt}</pre>
      </div>

      <div className={`boot-enter ${showEnter ? 'visible' : ''}`}>
        {'>'} entering system...<span className="cursor"></span>
      </div>

      <div className="boot-progress" style={{ width: `${progress}%` }} />
    </div>
  );
}
