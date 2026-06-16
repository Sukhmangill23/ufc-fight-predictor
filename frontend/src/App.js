import React, { useState, useEffect } from 'react';
import FighterCard from './components/FighterCard';
import VSBadge from './components/VSBadge';
import FightDetails from './components/FightDetails';
import PredictionResult from './components/PredictionResult';
import PredictionInsights from './components/PredictionInsights';
import FighterComparison from './components/FighterComparison';
import { useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import LogoutButton from './components/LogoutButton';
import FighterAnalyticsPage from './pages/AnalyticsPage';
import UpcomingEventsPage from './pages/UpcomingEventsPage';

import {
  getFighterStats,
  predictFight,
  getPredictionInsights
} from './services/api';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function App() {
  const [redFighter, setRedFighter]   = useState('');
  const [blueFighter, setBlueFighter] = useState('');
  const [redStats, setRedStats]       = useState(null);
  const [blueStats, setBlueStats]     = useState(null);
  const [rounds, setRounds]           = useState(3);
  const [titleBout, setTitleBout]     = useState(false);
  const [prediction, setPrediction]   = useState({});
  const [insights, setInsights]       = useState(null);
  const [activeTab, setActiveTab]     = useState('predict');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [prefillRed, setPrefillRed]   = useState('');
  const [prefillBlue, setPrefillBlue] = useState('');
  const [redSearchTerm, setRedSearchTerm]   = useState('');
  const [blueSearchTerm, setBlueSearchTerm] = useState('');
  const [autoPredictPending, setAutoPredictPending] = useState(false);

  const { currentUser, loading } = useAuth();

  useEffect(() => {
    const handler = async (e) => {
      const { red, blue, rounds: r, titleBout: tb } = e.detail;

      setPrediction({});
      setInsights(null);
      setRedStats(null);
      setBlueStats(null);
      setRedFighter(red);
      setBlueFighter(blue);
      setPrefillRed(red);
      setPrefillBlue(blue);
      setRedSearchTerm(red);
      setBlueSearchTerm(blue);
      setRounds(r || 3);
      setTitleBout(tb || false);
      setActiveTab('predict');

      setPrediction({ loading: true });
      setAutoPredictPending(true);

      try {
        const [redRes, blueRes] = await Promise.all([
          getFighterStats(red),
          getFighterStats(blue)
        ]);
        setRedStats(redRes.data);
        setBlueStats(blueRes.data);
      } catch (err) {
        console.error('Error prefetching fighter stats:', err);
        setPrediction({ error: 'Failed to load fighter stats' });
        setAutoPredictPending(false);
      }
    };

    window.addEventListener('navigateToPredict', handler);
    return () => window.removeEventListener('navigateToPredict', handler);
  }, []);

  useEffect(() => {
    if (autoPredictPending && redStats && blueStats && redFighter && blueFighter) {
      setAutoPredictPending(false);
      triggerPredict(redFighter, blueFighter, rounds, titleBout);
    }
  }, [autoPredictPending, redStats, blueStats]);

  if (loading) return <div className="loading">Loading...</div>;
  if (!currentUser) return <AuthPage />;

  const triggerPredict = async (red, blue, numRounds, isTitleBout) => {
    setPrediction({ loading: true });
    setInsights(null);
    try {
      const [predictionResponse, insightsResponse] = await Promise.all([
        predictFight({
          red_fighter:      red,
          blue_fighter:     blue,
          number_of_rounds: numRounds,
          title_bout:       isTitleBout ? 'true' : 'false'
        }),
        getPredictionInsights({
          red_fighter:      red,
          blue_fighter:     blue,
          number_of_rounds: numRounds,
          title_bout:       isTitleBout ? 'true' : 'false'
        })
      ]);
      setPrediction({ data: predictionResponse.data, redFighter: red, blueFighter: blue });
      setInsights(insightsResponse.data.insights);
    } catch (error) {
      let errorMsg = 'Error making prediction';
      if (error.response?.data?.error) errorMsg = error.response.data.error;
      else if (error.message)          errorMsg = error.message;
      setPrediction({ error: errorMsg });
    }
  };

  const handleFighterSelect = async (fighter, corner) => {
    try {
      if (corner === 'red') { setRedFighter(fighter); setRedStats(null); }
      else                  { setBlueFighter(fighter); setBlueStats(null); }

      const response = await getFighterStats(fighter);
      if (corner === 'red') setRedStats(response.data);
      else                  setBlueStats(response.data);
    } catch (error) {
      console.error('Error fetching fighter stats:', error);
      if (corner === 'red') setRedStats({ name: fighter });
      else                  setBlueStats({ name: fighter });
    }
  };

  const handlePredict = () => triggerPredict(redFighter, blueFighter, rounds, titleBout);

  return (
    <div className="app-background">
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <button className="close-btn" onClick={() => setSidebarOpen(false)}>×</button>
        </div>
        <nav className="sidebar-nav">
          <button
            className={activeTab === 'predict' ? 'active' : ''}
            onClick={() => { setActiveTab('predict'); setSidebarOpen(false); }}
          >
            Predict Fight
          </button>
          <button
            className={activeTab === 'events' ? 'active' : ''}
            onClick={() => { setActiveTab('events'); setSidebarOpen(false); }}
          >
            Upcoming Events
          </button>
          <button
            className={activeTab === 'analytics' ? 'active' : ''}
            onClick={() => { setActiveTab('analytics'); setSidebarOpen(false); }}
          >
            Analytics
          </button>
          <button
            className={activeTab === 'compare' ? 'active' : ''}
            onClick={() => { setActiveTab('compare'); setSidebarOpen(false); }}
          >
            Compare Fighters
          </button>
          <LogoutButton className="logout-btn" />
        </nav>
      </div>

      <div className="top-bar">
        <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
        <h1 className="app-title">UFC Predictor</h1>
      </div>

      <div className="main-container">
        {activeTab === 'predict' && (
          <div className="card w-100">
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
                    searchTerm={redSearchTerm}
                    setSearchTerm={setRedSearchTerm}
                    onSelectFighter={handleFighterSelect}
                    prefillFighter={prefillRed}
                  />
                </div>
                <div className="col-md-2 d-flex align-items-center justify-content-center">
                  <VSBadge />
                </div>
                <div className="col-md-5 d-flex flex-column">
                  <FighterCard
                    corner="blue"
                    stats={blueStats}
                    searchTerm={blueSearchTerm}
                    setSearchTerm={setBlueSearchTerm}
                    onSelectFighter={handleFighterSelect}
                    prefillFighter={prefillBlue}
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
                  className="btn-predict p-3 mb-3 bg-dark"
                  onClick={handlePredict}
                  disabled={prediction.loading}
                >
                  {prediction.loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      ANALYZING FIGHT...
                    </>
                  ) : (
                    'PREDICT WINNER'
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
                    {prediction.error}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'events'    && <UpcomingEventsPage />}
        {activeTab === 'analytics' && <FighterAnalyticsPage />}
        {activeTab === 'compare'   && <FighterComparison />}
      </div>
    </div>
  );
}

export default App;
