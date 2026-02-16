//
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Phase1 from './phases/Phase1';
import Phase2 from './phases/Phase2';
import Phase3 from './phases/Phase3';
import SalesGraph from './components/SalesGraph';
import Timer from './components/Timer';
import NetWorthDisplay from './components/NetWorthDisplay';
import './App.css';

const API_URL = 'http://localhost:3001/api';
const WS_URL = 'ws://localhost:3001';

function App() {
  const [sessionId, setSessionId] = useState(null);
  const [currentPhase, setCurrentPhase] = useState(1);
  const [netWorth, setNetWorth] = useState(10000);
  const [salesData, setSalesData] = useState({ baseline: 1000, current: 0, history: [] });
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marketStarted, setMarketStarted] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    const initSession = async () => {
      try {
        const response = await axios.post(`${API_URL}/init`);
        setSessionId(response.data.sessionId);
        setNetWorth(response.data.netWorth);
        setSalesData(response.data.salesData);
        setCurrentPhase(response.data.phase);
        setLoading(false);
      } catch (error) {
        console.error('Error initializing:', error);
      }
    };
    initSession();
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: 'register', sessionId }));
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'liveUpdate') {
        setSalesData(data.salesData);
        setNetWorth(data.netWorth);
        setMarketStarted(true);
      }
    };
    return () => ws.close();
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const loadQuestions = async () => {
      const response = await axios.get(`${API_URL}/questions/${currentPhase}`);
      setQuestions(response.data);
    };
    loadQuestions();
  }, [currentPhase, sessionId]);

  // UPDATED: Accepts 'launch' boolean
  const handleAnswersUpdate = async (answers, launch = false) => {
    try {
      const response = await axios.post(`${API_URL}/update-answers`, {
        sessionId,
        phase: currentPhase,
        answers,
        launch // Tells backend to start market/deduct costs
      });
      setNetWorth(response.data.netWorth);
    } catch (error) {
      console.error('Error submitting answers:', error);
    }
  };

  const handlePhaseComplete = async () => {
    const response = await axios.post(`${API_URL}/advance-phase`, { sessionId });
    setCurrentPhase(response.data.currentPhase);
  };

  if (loading || !questions) return <div className="loading-screen">Loading...</div>;

  const renderPhase = () => {
    switch (currentPhase) {
      case 1: return <Phase1 questions={questions} onUpdate={handleAnswersUpdate} />;
      case 2: return <Phase2 questions={questions} onUpdate={handleAnswersUpdate} />;
      case 3: return <Phase3 questions={questions} onUpdate={handleAnswersUpdate} />;
      default: return <div className="completion-screen"><h1>Simulation Complete!</h1></div>;
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">TORC</h1>
          <span className="app-subtitle">Market Simulator</span>
        </div>
        <div className="header-right">
          <NetWorthDisplay netWorth={netWorth} />
          <Timer duration={180} phase={currentPhase} onComplete={handlePhaseComplete} />
        </div>
      </header>

      <div className="app-content">
        <div className="main-section">
          <div className="phase-indicator">
            <span className="phase-label">Phase {currentPhase}</span>
          </div>
          {renderPhase()}
        </div>

        <aside className="sidebar">
          {marketStarted ? (
            <SalesGraph data={salesData} />
          ) : (
            <div className="locked-graph-placeholder">
              <h3>Market Pending</h3>
              <p>Launch strategy to view performance.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default App;