import React, { useState } from 'react';

const FightDetails = ({ onPredict }) => {
    const [rounds, setRounds] = useState(3);
    const [titleBout, setTitleBout] = useState(false);

    return (
        <div className="fight-details">
            <h4>FIGHT DETAILS</h4>
            <select value={rounds} onChange={(e) => setRounds(e.target.value)}>
                <option value="3">3 Rounds</option>
                <option value="5">5 Rounds (Title Fight)</option>
            </select>
            <label>
                <input
                    type="checkbox"
                    checked={titleBout}
                    onChange={(e) => setTitleBout(e.target.checked)}
                />
                Title Fight
            </label>
            <button onClick={() => onPredict(rounds, titleBout)}>PREDICT WINNER</button>
        </div>
    );
};

export default FightDetails;
