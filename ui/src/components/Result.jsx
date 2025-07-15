import React from 'react';

const Result = ({ prediction, probabilities }) => {
    if (!prediction) return null;
    return (
        <div className="result-container">
            <h3>Winner: {prediction.winner}</h3>
            <p>Confidence: {prediction.confidence}</p>
            <div>
                {probabilities.map((prob) => (
                    <div key={prob.fighter}>
                        {prob.fighter}: {prob.prob}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Result;
