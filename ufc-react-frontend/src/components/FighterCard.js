// src/components/FighterCard.js
import React from 'react';
import SearchBar from './SearchBar';

const FighterCard = ({ corner, stats, searchTerm, setSearchTerm, onSelectFighter }) => {
  const cornerClass = corner === 'red' ? 'red-corner' : 'blue-corner';
  const cornerTitle = corner === 'red' ? 'RED CORNER' : 'BLUE CORNER';

  // Check if stats are available and have data
  const hasStats = stats && Object.keys(stats).length > 0;

  return (
    <div className={`fighter-card ${cornerClass}`}>
      <h3 className={`${corner === 'red' ? 'text-danger' : 'text-primary'} mb-3`}>{cornerTitle}</h3>
      <SearchBar
        corner={corner}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onSelectFighter={onSelectFighter}
      />

      {hasStats ? (
        <>
          <h2 className="fighter-name">{stats.name}</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.height || 'N/A'} cm</div>
              <div className="stat-label">Height</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.reach || 'N/A'} cm</div>
              <div className="stat-label">Reach</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.age || 'N/A'}</div>
              <div className="stat-label">Age</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.stance || 'N/A'}</div>
              <div className="stat-label">Stance</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.win_streak || '0'}</div>
              <div className="stat-label">Win Streak</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.ko_wins || '0'}</div>
              <div className="stat-label">KO Wins</div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center text-muted">
          <i className="fas fa-user fa-4x mb-3"></i>
          <p>Select a fighter to see stats</p>
        </div>
      )}
    </div>
  );
};

export default FighterCard;
