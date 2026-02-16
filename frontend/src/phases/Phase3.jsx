import React, { useState, useEffect } from 'react';
import QuestionCard from '../components/QuestionCard';
import './Phase.css';

function Phase3({ questions, onUpdate }) {
  const [answers, setAnswers] = useState({
    equity: '',
    valuation: ''
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (Object.values(answers).some(val => val !== '')) {
        const numericAnswers = {
          equity: parseFloat(answers.equity) || 0,
          valuation: parseFloat(answers.valuation) || 0
        };
        onUpdate(numericAnswers);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [answers, onUpdate]);

  const handleInputChange = (field, value) => {
    setAnswers(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="phase-container">
      {questions.videoUrl && (
        <div className="video-embed">
          <iframe
            src={questions.videoUrl}
            title="Phase Video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      )}

      <div className="questions-grid">
        {questions.questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            answers={answers}
            onInputChange={handleInputChange}
            questionNumber={index + 1}
          />
        ))}
      </div>

      <div className="phase-info">
        <div className="info-card">
          <h4>Phase Instructions</h4>
          <p>Take your company public with an IPO. Manage risk and maximize shareholder value.</p>
          <ul>
            <li>Set public equity offering percentage</li>
            <li>Determine IPO valuation</li>
            <li>Optimize for market reception</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Phase3;