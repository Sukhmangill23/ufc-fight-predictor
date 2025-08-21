import React, { useState } from 'react';
import FighterCard from './components/FighterCard';
import VSBadge from './components/VSBadge';
import FightDetails from './components/FightDetails';
import PredictionResult from './components/PredictionResult';
import PredictionInsights from './components/PredictionInsights';
import FighterComparison from './components/FighterComparison'; // Import the new component
import { useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import LogoutButton from './components/LogoutButton';
// <-- Import LogoutButton

import {
  getFighterStats,
  predictFight,
  getPredictionInsights
} from './services/api';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import FighterAnalyticsPage from './pages/AnalyticsPage';

function App() {
  const [redFighter, setRedFighter] = useState('');
  const [blueFighter, setBlueFighter] = useState('');
  const [redStats, setRedStats] = useState(null);
  const [blueStats, setBlueStats] = useState(null);
  const [rounds, setRounds] = useState(3);
  const [titleBout, setTitleBout] = useState(false);
  const [prediction, setPrediction] = useState({});
  const [insights, setInsights] = useState(null);
  const [activeTab, setActiveTab] = useState('predict'); // 'predict', 'analytics', or 'compare'
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!currentUser) {
    return <AuthPage />;
  }

  const handleFighterSelect = async (fighter, corner) => {
    try {
      if (corner === 'red') {
        setRedFighter(fighter);
        setRedStats(null);
      } else {
        setBlueFighter(fighter);
        setBlueStats(null);
      }

      const response = await getFighterStats(fighter);
      const stats = response.data;

      if (corner === 'red') {
        setRedStats(stats);
      } else {
        setBlueStats(stats);
      }
    } catch (error) {
      console.error('Error fetching fighter stats:', error);
      if (corner === 'red') {
        setRedStats({ name: fighter });
      } else {
        setBlueStats({ name: fighter });
      }
    }
  };

  const handlePredict = async () => {
    if (!redFighter || !blueFighter) {
      setPrediction({ error: 'Please select both fighters!' });
      return;
    }

    if (redFighter === blueFighter) {
      setPrediction({ error: 'Please select two different fighters!' });
      return;
    }

    setPrediction({ loading: true });
    setInsights(null);

    try {
      // Get prediction
      const predictionResponse = await predictFight({
        red_fighter: redFighter,
        blue_fighter: blueFighter,
        number_of_rounds: rounds,
        title_bout: titleBout ? 'true' : 'false'
      });

      // Get insights
      const insightsResponse = await getPredictionInsights({
        red_fighter: redFighter,
        blue_fighter: blueFighter,
        number_of_rounds: rounds,
        title_bout: titleBout ? 'true' : 'false'
      });

      setPrediction({
        data: predictionResponse.data,
        redFighter,
        blueFighter
      });

      setInsights(insightsResponse.data.insights);
    } catch (error) {
      console.error('Prediction error:', error);
      let errorMsg = 'Error making prediction';

      if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error.message) {
        errorMsg = error.message;
      }

      setPrediction({ error: errorMsg });
    }
  };

  return (
    <div className="overlay">
      <div className="container-fluid p-0 h-100">
        {/* Top Navigation Bar */}
        <div className="bg-dark p-3 d-flex justify-content-between align-items-center">
<h1
  style={{
    background: 'linear-gradient(90deg, #b22721, #2640d3)', // red to blue gradient
    color: 'white',
    fontFamily: "'Orbitron', sans-serif",
    fontWeight: '700',
    fontSize: '2rem',
    padding: '0.6em 1.8em',
    borderRadius: '12px',
    textAlign: 'center',
    userSelect: 'none',
    display: 'inline-block',
    letterSpacing: '0.1em',
    boxShadow: '0 4px 8px rgba(0,0,0,0.3)', // subtle shadow for depth
  }}
>
  UFC Predictor
</h1>




          {currentUser && (
            <div className="d-flex align-items-center">
              <span className="text-light me-3">
                <i className="fas fa-user me-2"></i>
                Welcome, User
              </span>
              <LogoutButton />
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="tabs p-3 bg-dark">
          <button
            className={`tab-btn ${activeTab === 'predict' ? 'active' : ''}`}
            onClick={() => setActiveTab('predict')}
          >
            Predict Fight
          </button>
          <button
            className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>
          {/* New Comparison Tab */}
          <button
            className={`tab-btn ${activeTab === 'compare' ? 'active' : ''}`}
            onClick={() => setActiveTab('compare')}
          >
            Compare Fighters
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-grow-1 overflow-auto p-3">
          {/* Prediction Tab */}
          {activeTab === 'predict' && (
            <div className="card h-100">
              <div className="card-header bg-dark py-2">
                <h1 className="mb-0 h4">
                  <i className="fas fa-fist-raised me-2"></i> UFC FIGHT PREDICTOR
                </h1>
              </div>

              <div className="card-body d-flex flex-column p-3">
                <div className="row flex-grow-1 mb-3">
                  <div className="col-md-5 d-flex flex-column">
                    <FighterCard
                      corner="red"
                      stats={redStats}
                      onSelectFighter={handleFighterSelect}
                    />
                  </div>

                  <div className="col-md-2 d-flex align-items-center justify-content-center">
                    <VSBadge />
                  </div>

                  <div className="col-md-5 d-flex flex-column">
                    <FighterCard
                      corner="blue"
                      stats={blueStats}
                      onSelectFighter={handleFighterSelect}
                    />
                  </div>
                </div>

                <FightDetails
                  rounds={rounds}
                  setRounds={setRounds}
                  titleBout={titleBout}
                  setTitleBout={setTitleBout}
                />

                <div className="mt-auto">
                  <button
                    className="btn btn-lg w-100"
                    style={{
                      background: 'linear-gradient(to right, #c00a0a, #0a4fd2)',
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                    onClick={handlePredict}
                    disabled={prediction.loading}
                  >
                    {prediction.loading ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                        ></span>
                        ANALYZING FIGHT...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-bolt me-2"></i> PREDICT WINNER
                      </>
                    )}
                  </button>

                  <PredictionResult prediction={prediction} />

                  {insights && (
                    <PredictionInsights
                      insights={insights}
                      redFighter={redFighter}
                      blueFighter={blueFighter}
                    />
                  )}

                  {prediction.error && (
                    <div className="alert alert-danger mt-3">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      {prediction.error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="h-100">
              <FighterAnalyticsPage />
            </div>
          )}

          {/* New Comparison Tab */}
          {activeTab === 'compare' && (
            <div className="card">
              <div className="card-header bg-dark">
                <h1 className="mb-0">FIGHTER COMPARISON TOOL</h1>
              </div>
              <div className="card-body">
                <FighterComparison />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
