import React from 'react';

const PredictionResult = ({ prediction }) => {
  if (!prediction || (!prediction.loading && !prediction.error && !prediction.data)) {
    return null; // don't render anything
  }

  return (
    <div className="result-container p-3 mb-3 bg-dark">
      {prediction.loading ? (
        <div className="loading text-center">
          <i className="fas fa-spinner fa-spin fa-3x"></i>
          <h4 className="mt-3">Analyzing fight...</h4>
        </div>
      ) : prediction.error ? (
        <div className="error text-danger">{prediction.error}</div>
      ) : (
        <>
          <div className="winner-card text-center p-3 mb-3">
            <div className="winner-name h4">{prediction.data.prediction}</div>
<div className="confidence text-light">
  WIN PROBABILITY: {prediction.data.confidence}
</div>

          </div>
          <div className="probabilities d-flex justify-content-between">
            <div className="prob-card prob-red p-2 rounded">
              {prediction.redFighter}: {prediction.data.red_prob}
            </div>
            <div className="prob-card prob-blue p-2 rounded">
              {prediction.blueFighter}: {prediction.data.blue_prob}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PredictionResult;
