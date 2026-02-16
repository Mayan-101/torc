import React, { useEffect, useState } from 'react';

function Timer({ duration, phase, onComplete }) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    setTimeLeft(duration);
  }, [phase, duration]);

  useEffect(() => {
    if (timeLeft <= 0) {
      onComplete();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onComplete]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerClass = () => {
    if (timeLeft <= 30) return 'critical';
    if (timeLeft <= 60) return 'warning';
    return '';
  };

  return (
    <div className="timer">
      <span className="timer-label">Time Remaining</span>
      <span className={`timer-value ${getTimerClass()}`}>
        {formatTime(timeLeft)}
      </span>
    </div>
  );
}

export default Timer;