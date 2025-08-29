// src/components/FighterCard.js
import React from 'react';
import SearchBar from './SearchBar';
import "../App.css"


const FighterCard = ({ corner, stats, searchTerm, setSearchTerm, onSelectFighter }) => {
  const cornerClass = corner === 'red' ? 'red-corner' : 'blue-corner';
  const cornerTitle = corner === 'red' ? 'RED CORNER' : 'BLUE CORNER';

  const hasStats = stats && Object.keys(stats).length > 0;

return (
  <div className={`fighter-card ${cornerClass} p-3 mb-3 bg-dark`}>
    <h3 className={`${corner === 'red' ? 'text-danger' : 'text-primary'} mb-3`}>
      {cornerTitle}
    </h3>
    <SearchBar
      corner={corner}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      onSelectFighter={onSelectFighter}
    />

    {hasStats ? (
      <>
        <h2 className="fighter-name  p-3 mb-3 bg-dark">{stats.name}</h2>
        <div className="stats-grid">
          <div className="stat-card  d-flex flex-column align-items-center justify-content-center text-center">
            <div className="stat-value">{stats.height ? `${stats.height} cm` : 'N/A'}</div>
            <div className="stat-label">Height</div>
          </div>
            <div
                className="stat-card d-flex flex-column align-items-center justify-content-center text-center">
                <div className="stat-value">
                    {stats.reach != null && stats.reach !== ''
                        ? `${String(stats.reach).trim()}\u00A0cm`   // NBSP prevents wrap
                        : 'N/A'}
                </div>
                <div className="stat-label">Reach</div>
            </div>
            <div
                className="stat-card d-flex flex-column align-items-center justify-content-center text-center">
                <div className="stat-value">{stats.age ?? 'N/A'}</div>
            <div className="stat-label">Age</div>
          </div>
          <div className="stat-card d-flex flex-column align-items-center justify-content-center text-center">
            <div className="stat-value">{stats.stance ?? 'N/A'}</div>
            <div className="stat-label">Stance</div>
          </div>
          <div className="stat-card d-flex flex-column align-items-center justify-content-center text-center">
            <div className="stat-value">{stats.win_streak ?? '0'}</div>
            <div className="stat-label">Win Streak</div>
          </div>
          <div className="stat-card d-flex flex-column align-items-center justify-content-center text-center">
            <div className="stat-value">{stats.ko_wins ?? '0'}</div>
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
