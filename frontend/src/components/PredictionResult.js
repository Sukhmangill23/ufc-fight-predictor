import React from 'react';

const PredictionResult = ({ prediction }) => (
  <div className="result-container mt-4">
    {prediction.loading ? (
      <div className="loading">
        <i className="fas fa-spinner fa-spin fa-3x"></i>
        <h4 className="mt-3">Analyzing fight...</h4>
      </div>
    ) : prediction.error ? (
      <div className="error">{prediction.error}</div>
    ) : prediction.data ? (
      <>
        <div className="winner-card">
          <div className="winner-name">{prediction.data.prediction}</div>
          <div className="confidence">WIN PROBABILITY: {prediction.data.confidence}</div>
        </div>
        <div className="probabilities">
          <div className="prob-card prob-red">
            {prediction.redFighter}: {prediction.data.red_prob}
          </div>
          <div className="prob-card prob-blue">
            {prediction.blueFighter}: {prediction.data.blue_prob}
          </div>
        </div>
      </>
    ) : null}
  </div>
);

export default PredictionResult;
