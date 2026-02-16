import React, { useState, useEffect } from 'react';
import QuestionCard from '../components/QuestionCard';
import './Phase.css';

function Phase2({ questions, onUpdate }) {
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
          <p>Negotiate with investors to secure funding. Balance equity dilution with company valuation.</p>
          <ul>
            <li>Set competitive equity offering</li>
            <li>Determine realistic company valuation</li>
            <li>Optimize for maximum capital with minimal dilution</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Phase2;