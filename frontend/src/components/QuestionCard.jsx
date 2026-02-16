import React from 'react';
import './QuestionCard.css';

function QuestionCard({ question, answers, onInputChange, questionNumber }) {
  const renderInput = (input) => {
    switch (input.type) {
      case 'number':
        return (
          <div key={input.name} className="input-group">
            <label className="input-label">{input.label}</label>
            <div className="input-wrapper">
              <input
                type="number"
                step="any"
                value={answers[input.name] || ''}
                onChange={(e) => onInputChange(input.name, e.target.value)}
                className="number-input"
                placeholder={`Enter ${input.label.toLowerCase()}`}
              />
              {input.unit && <span className="input-unit">{input.unit}</span>}
            </div>
          </div>
        );
      
      case 'boolean':
        return (
          <div key={input.name} className="input-group">
            <label className="input-label">{input.label}</label>
            <div className="boolean-wrapper">
              {input.options.map((option, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`boolean-button ${answers[input.name] === (idx === 0) ? 'active' : ''}`}
                  onClick={() => onInputChange(input.name, idx === 0)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="question-card">
      <div className="question-header">
        <span className="question-number">Q{questionNumber}</span>
        <h3 className="question-title">{question.title}</h3>
      </div>
      
      <p className="question-description">{question.description}</p>
      
      <div className="inputs-container">
        {question.inputs.map(input => renderInput(input))}
      </div>
    </div>
  );
}

export default QuestionCard;