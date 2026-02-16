//
import React, { useState } from 'react';
import QuestionCard from '../components/QuestionCard';
import './Phase.css';

function Phase1({ questions, onUpdate }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isMarketLive, setIsMarketLive] = useState(false);

  const handleInputChange = (field, value) => {
    setAnswers(prev => ({ ...prev, [field]: value }));
  };

  // Logic for Next / Launch
  const handleNext = (isLaunch = false) => {
    const numericAnswers = {
      ...answers,
      numPeople: parseFloat(answers.numPeople) || 0,
      confidence: parseFloat(answers.confidence) || 0,
      adultDiameter: parseFloat(answers.adultDiameter) || 0,
      adultHeight: parseFloat(answers.adultHeight) || 0,
      childDiameter: parseFloat(answers.childDiameter) || 0,
      childHeight: parseFloat(answers.childHeight) || 0
    };

    // Trigger update: ONLY start market if isLaunch is true
    onUpdate(numericAnswers, isLaunch);

    if (isLaunch) {
      setIsMarketLive(true);
    } else {
      if (currentStep < questions.questions.length - 1) {
        setCurrentStep(prev => prev + 1);
      }
    }
  };

  // Logic for Previous
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleRedo = () => {
    setIsMarketLive(false); // Just unlocks the UI, market keeps running
  };

  const currentQuestion = questions.questions[currentStep];
  const isLastQuestion = currentStep === questions.questions.length - 1;

  return (
    <div className="phase-container">
      {/* Persistent Video */}
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

      {/* Phase Progress */}
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
            
            {/* BUTTON GROUP */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              {/* Previous Button - Hidden on first step */}
              {currentStep > 0 && (
                <button 
                  className="submit-answer-btn" 
                  style={{ background: '#1a1f35', border: '1px solid #2a3148', color: '#8b92a8' }}
                  onClick={handlePrevious}
                >
                  Previous
                </button>
              )}

              {/* Next / Launch Button */}
              <button 
                className="submit-answer-btn" 
                onClick={() => handleNext(isLastQuestion)}
              >
                {isLastQuestion ? 'Launch Strategy' : 'Next Question'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Phase1;