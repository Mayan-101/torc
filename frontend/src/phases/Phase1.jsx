//
import React, { useState } from 'react';
import QuestionCard from '../components/QuestionCard';
import './Phase.css';

function Phase1({ questions, onUpdate }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isMarketLive, setIsMarketLive] = useState(false); // Track if answers are submitted

  const handleInputChange = (field, value) => {
    setAnswers(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    // 1. Send data to backend (Updates Market Strategy)
    const numericAnswers = {
      ...answers,
      numPeople: parseFloat(answers.numPeople) || 0,
      confidence: parseFloat(answers.confidence) || 0,
      adultDiameter: parseFloat(answers.adultDiameter) || 0,
      adultHeight: parseFloat(answers.adultHeight) || 0,
      childDiameter: parseFloat(answers.childDiameter) || 0,
      childHeight: parseFloat(answers.childHeight) || 0
    };
    
    onUpdate(numericAnswers);
    setIsMarketLive(true); // Lock interface and show "Redo" option

    // 2. Advance step if not finished
    if (currentStep < questions.questions.length - 1) {
      setCurrentStep(prev => prev + 1);
      setIsMarketLive(false); // Keep open for next question
    }
  };

  const handleRedo = () => {
    setIsMarketLive(false); // Unlock inputs to allow editing
  };

  const currentQuestion = questions.questions[currentStep];

  return (
    <div className="phase-container">
      {/* 1. ENLARGED VIDEO - Persistent across all steps */}
      {questions.videoUrl && (
        <div className="video-embed-large">
          <iframe
            src={questions.videoUrl}
            title="Phase Video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      )}

      {/* Progress */}
      <div className="phase-info">
        <div className="info-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <h4>Phase Progress</h4>
            <span>Step {currentStep + 1} / {questions.questions.length}</span>
          </div>
          <div className="progress-bar-container">
            <div 
              className="progress-fill" 
              style={{ width: `${((currentStep + 1) / questions.questions.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Question or Market Monitor State */}
      <div className="questions-grid">
        {isMarketLive ? (
          <div className="market-live-state">
            <div className="status-indicator">
              <span className="pulse-dot"></span>
              <h3>Market Strategy Active</h3>
            </div>
            <p>Your strategy is currently running in the market. Check the graph on the right.</p>
            
            <button className="redo-btn" onClick={handleRedo}>
              Redo / Adjust Strategy
            </button>
          </div>
        ) : (
          <div className="active-question-wrapper">
            {currentQuestion && (
              <QuestionCard
                key={currentQuestion.id}
                question={currentQuestion}
                answers={answers}
                onInputChange={handleInputChange}
                questionNumber={currentStep + 1}
              />
            )}
            
            <button className="submit-answer-btn" onClick={handleSubmit}>
              {currentStep === questions.questions.length - 1 ? 'Launch Strategy' : 'Next Question'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Phase1;