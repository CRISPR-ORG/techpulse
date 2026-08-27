import './TerminalWindow.css';

export default function TerminalWindow({ title = 'techpulse@hub:~$', children, className = '' }) {
  return (
    <div className={`terminal-window ${className}`}>
      <div className="terminal-header">
        <div className="terminal-dots">
          <span className="dot dot--red" />
          <span className="dot dot--yellow" />
          <span className="dot dot--green" />
        </div>
        <span className="terminal-title">{title}</span>
      </div>
      <div className="terminal-body">
        {children}
      </div>
    </div>
  );
}
