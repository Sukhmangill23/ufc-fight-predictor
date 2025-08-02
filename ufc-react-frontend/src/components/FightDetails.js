import React from 'react';

const FightDetails = ({ rounds, setRounds, titleBout, setTitleBout }) => {
  return (
    <div className="fight-details">
      <div className="details-column">
        <div className="form-group">
          <label className="form-label">Number of Rounds</label>
          <select
            className="form-select"
            value={rounds}
            onChange={(e) => setRounds(parseInt(e.target.value))}
          >
            <option value={3}>3 Rounds</option>
            <option value={5}>5 Rounds</option>
          </select>
        </div>
      </div>

      <div className="details-column">
        <div className="form-group">
          <label className="form-label">Fight Type</label>
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="titleBout"
              checked={titleBout}
              onChange={(e) => setTitleBout(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="titleBout">
              Title Bout
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FightDetails;
