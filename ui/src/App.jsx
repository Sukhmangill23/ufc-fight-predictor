import React, { useState, useEffect } from 'react';
import FighterCorner from './components/FighterCorner';
import FightDetails from './components/FightDetails';
import PredictionResult from './components/PredictionResult';
import { searchFighters, getFighterStats, predictWinner } from './services/api';
import './App.css';

function App() {
  const [redFighter, setRedFighter] = useState('');
  const [blueFighter, setBlueFighter] = useState('');
  const [redStats, setRedStats] = useState(null);
  const [blueStats, setBlueStats] = useState(null);
  const [redSearchResults, setRedSearchResults] = useState([]);
  const [blueSearchResults, setBlueSearchResults] = useState([]);
  const [rounds, setRounds] = useState(3);
  const [titleBout, setTitleBout] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle fighter search
  const handleSearch = async (corner, term) => {
    if (term.length < 3) {
      corner === 'red' ? setRedSearchResults([]) : setBlueSearchResults([]);
      return;
    }

    try {
      const fighters = await searchFighters(term);
      corner === 'red' ? setRedSearchResults(fighters) : setBlueSearchResults(fighters);
    } catch (err) {
      setError('Error searching fighters');
    }
  };

  // Handle fighter selection
  const handleSelectFighter = async (corner, fighter) => {
    try {
      const stats = await getFighterStats(fighter);
      if (stats.error) {
        setError(stats.error);
        return;
      }

      if (corner === 'red') {
        setRedFighter(fighter);
        setRedStats(stats);
        setRedSearchResults([]);
      } else {
        setBlueFighter(fighter);
        setBlueStats(stats);
        setBlueSearchResults([]);
      }
    } catch (err) {
      setError('Error loading fighter stats');
    }
  };

  // Handle prediction
  const handlePredict = async () => {
    if (!redFighter || !blueFighter) {
      setError('Please select both fighters!');
      return;
    }

    if (redFighter === blueFighter) {
      setError('Please select two different fighters!');
      return;
    }

    setLoading(true);
    setError(null);
    setPrediction(null);

    try {
      const result = await predictWinner({
        red_fighter: redFighter,
        blue_fighter: blueFighter,
        number_of_rounds: rounds,
        title_bout: titleBout
      });

      if (result.error) {
        setError(result.error);
      } else {
        setPrediction(result);
      }
    } catch (err) {
      setError('Error making prediction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overlay">
      <div className="container py-4">
        <div className="card">
          <div className="card-header">
            <h1><i className="fas fa-fist-raised me-2"></i> UFC FIGHT PREDICTOR</h1>
          </div>

          <div className="card-body p-4">
            <div className="row g-4">
              <FighterCorner
                corner="red"
                fighter={redFighter}
                stats={redStats}
                searchResults={redSearchResults}
                onSearch={handleSearch}
                onSelect={handleSelectFighter}
              />

              <div className="col-md-2 position-relative">
                <div className="vs-badge">VS</div>
              </div>

              <FighterCorner
                corner="blue"
                fighter={blueFighter}
                stats={blueStats}
                searchResults={blueSearchResults}
                onSearch={handleSearch}
                onSelect={handleSelectFighter}
              />
            </div>

            <FightDetails
              rounds={rounds}
              titleBout={titleBout}
              onRoundsChange={setRounds}
              onTitleBoutChange={setTitleBout}
            />

            <button
              className="btn btn-predict btn-lg mt-4"
              onClick={handlePredict}
              disabled={loading}
            >
              {loading ? (
                <><i className="fas fa-spinner fa-spin me-2"></i> ANALYZING...</>
              ) : (
                <><i className="fas fa-bolt me-2"></i> PREDICT WINNER</>
              )}
            </button>

            <PredictionResult
              prediction={prediction}
              loading={loading}
              error={error}
              redFighter={redFighter}
              blueFighter={blueFighter}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
