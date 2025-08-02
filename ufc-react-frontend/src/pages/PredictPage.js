import React, { useState } from 'react';
import FighterCard from '../components/FighterCard';
import VSBadge from '../components/VSBadge';
import FightDetails from '../components/FightDetails';
import PredictionResult from '../components/PredictionResult';
import PredictionInsights from '../components/PredictionInsights';
import {
  getFighterStats,
  predictFight,
  getPredictionInsights
} from '../services/api';

const PredictPage = () => {
  const [redFighter, setRedFighter] = useState('');
  const [blueFighter, setBlueFighter] = useState('');
  const [redStats, setRedStats] = useState(null);
  const [blueStats, setBlueStats] = useState(null);
  const [rounds, setRounds] = useState(3);
  const [titleBout, setTitleBout] = useState(false);
  const [prediction, setPrediction] = useState({});
  const [insights, setInsights] = useState(null);

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
    <div className="card">
      <div className="card-header bg-dark">
        <h1 className="mb-0">PREDICTION DASHBOARD</h1>
      </div>

      <div className="card-body p-4">
        <div className="row">
          <div className="col-md-5">
            <FighterCard
              corner="red"
              stats={redStats}
              onSelectFighter={handleFighterSelect}
            />
          </div>

          <div className="col-md-2 d-flex align-items-center justify-content-center">
            <VSBadge />
          </div>

          <div className="col-md-5">
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

        <button
          className="btn btn-lg w-100 mt-4"
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
              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
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
  );
};

export default PredictPage;
