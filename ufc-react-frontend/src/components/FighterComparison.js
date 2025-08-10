import React, { useState } from 'react';
import { getFighterStats, searchFighters } from '../services/api';

const FighterComparison = () => {
  const [fighter1, setFighter1] = useState('');
  const [fighter2, setFighter2] = useState('');
  const [stats1, setStats1] = useState(null);
  const [stats2, setStats2] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchResults1, setSearchResults1] = useState([]);
  const [searchResults2, setSearchResults2] = useState([]);
  const [showResults1, setShowResults1] = useState(false);
  const [showResults2, setShowResults2] = useState(false);

  // Handle search for fighter 1
  const handleSearch1 = async (term) => {
    setFighter1(term);
    if (term.length > 2) {
      const results = await searchFighters(term);
      setSearchResults1(results.data);
      setShowResults1(true);
    } else {
      setShowResults1(false);
    }
  };

  // Handle search for fighter 2
  const handleSearch2 = async (term) => {
    setFighter2(term);
    if (term.length > 2) {
      const results = await searchFighters(term);
      setSearchResults2(results.data);
      setShowResults2(true);
    } else {
      setShowResults2(false);
    }
  };

  // Handle selection for fighter 1
  const handleSelectFighter1 = (fighter) => {
    setFighter1(fighter);
    setShowResults1(false);
    setStats1(null);
  };

  // Handle selection for fighter 2
  const handleSelectFighter2 = (fighter) => {
    setFighter2(fighter);
    setShowResults2(false);
    setStats2(null);
  };

  const handleSearch = async () => {
    if (!fighter1 || !fighter2) return;

    setLoading(true);
    try {
      const response1 = await getFighterStats(fighter1);
      const response2 = await getFighterStats(fighter2);
      setStats1(response1.data);
      setStats2(response2.data);
    } catch (error) {
      console.error('Error fetching fighter stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Stats to compare
  const statFields = [
    { label: 'Height (cm)', key: 'height' },
    { label: 'Reach (cm)', key: 'reach' },
    { label: 'Age', key: 'age' },
    { label: 'Stance', key: 'stance' },
    { label: 'Weight Class', key: 'weight_class' },
    { label: 'Win Streak', key: 'win_streak' },
    { label: 'KO Wins', key: 'ko_wins' },
    { label: 'Total Fights', key: 'total_fights' },
    { label: 'Avg Sig Strikes', key: 'avg_sig_str' },
    { label: 'Avg Takedown %', key: 'avg_td_pct' },
    { label: 'Avg Submission Attempts', key: 'avg_sub_att' },
  ];

  // Calculate advantage indicators
  const calculateAdvantage = (stat1, stat2) => {
    if (stat1 > stat2) return { value: stat1 - stat2, winner: 1 };
    if (stat2 > stat1) return { value: stat2 - stat1, winner: 2 };
    return { value: 0, winner: 0 };
  };

  // Radar chart data
  const radarStats = [
    { name: 'Striking', key: 'avg_sig_str' },
    { name: 'Grappling', key: 'avg_td_pct' },
    { name: 'Submissions', key: 'avg_sub_att' },
    { name: 'Experience', key: 'total_fights' },
    { name: 'Knockouts', key: 'ko_wins' },
    { name: 'Win Streak', key: 'win_streak' }
  ];

  // Render radar chart
  const renderRadarChart = () => {
    if (!stats1 || !stats2) return null;

    const maxValues = {};
    radarStats.forEach(stat => {
      maxValues[stat.key] = Math.max(
        stats1[stat.key] || 0,
        stats2[stat.key] || 0,
        1 // Ensure at least 1 to avoid division by zero
      );
    });

    const size = 200;
    const center = size / 2;
    const radius = size * 0.4;
    const points = radarStats.length;
    const angle = (2 * Math.PI) / points;

    return (
      <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1].map(level => (
            <circle
              key={level}
              cx={center}
              cy={center}
              r={radius * level}
              fill="none"
              stroke="#333"
              strokeWidth="0.5"
            />
          ))}

          {/* Axes */}
          {radarStats.map((stat, i) => {
            const x = center + radius * Math.cos(i * angle - Math.PI / 2);
            const y = center + radius * Math.sin(i * angle - Math.PI / 2);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="#444"
                strokeWidth="0.5"
              />
            );
          })}

          {/* Fighter 1 area */}
          <polygon
            points={radarStats.map((stat, i) => {
              const value = (stats1[stat.key] || 0) / maxValues[stat.key];
              const x = center + radius * value * Math.cos(i * angle - Math.PI / 2);
              const y = center + radius * value * Math.sin(i * angle - Math.PI / 2);
              return `${x},${y}`;
            }).join(' ')}
            fill="rgba(192, 10, 10, 0.4)"
            stroke="#c00a0a"
            strokeWidth="2"
          />

          {/* Fighter 2 area */}
          <polygon
            points={radarStats.map((stat, i) => {
              const value = (stats2[stat.key] || 0) / maxValues[stat.key];
              const x = center + radius * value * Math.cos(i * angle - Math.PI / 2);
              const y = center + radius * value * Math.sin(i * angle - Math.PI / 2);
              return `${x},${y}`;
            }).join(' ')}
            fill="rgba(10, 79, 212, 0.4)"
            stroke="#0a4fd2"
            strokeWidth="2"
          />

          {/* Labels */}
          {radarStats.map((stat, i) => {
            const x = center + (radius + 15) * Math.cos(i * angle - Math.PI / 2);
            const y = center + (radius + 15) * Math.sin(i * angle - Math.PI / 2);
            return (
              <text
                key={i}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                fontSize="10"
              >
                {stat.name}
              </text>
            );
          })}
        </svg>

        {/* Legend */}
        <div style={{
          position: 'absolute',
          bottom: 10,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '15px', height: '15px', backgroundColor: 'rgba(192, 10, 10, 0.4)', marginRight: '5px' }}></div>
            <span style={{ color: '#fff', fontSize: '12px' }}>{fighter1}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '15px', height: '15px', backgroundColor: 'rgba(10, 79, 212, 0.4)', marginRight: '5px' }}></div>
            <span style={{ color: '#fff', fontSize: '12px' }}>{fighter2}</span>
          </div>
        </div>
      </div>
    );
  };

  // Render advantage cards
  const renderAdvantageCards = () => {
    if (!stats1 || !stats2) return null;

    const advantages = [
      { name: 'Striking Power', key: 'avg_sig_str', icon: 'fa-fist-raised' },
      { name: 'Grappling', key: 'avg_td_pct', icon: 'fa-wrestling' },
      { name: 'Submissions', key: 'avg_sub_att', icon: 'fa-lock' },
      { name: 'Experience', key: 'total_fights', icon: 'fa-history' }
    ];

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginTop: '20px' }}>
        {advantages.map(adv => {
          const advantage = calculateAdvantage(stats1[adv.key], stats2[adv.key]);
          if (advantage.value === 0) return null;

          return (
            <div key={adv.key} style={{
              flex: '1',
              minWidth: '200px',
              backgroundColor: '#1a1a1a',
              borderRadius: '10px',
              padding: '15px',
              border: `2px solid ${advantage.winner === 1 ? '#c00a0a' : '#0a4fd2'}`,
              boxShadow: `0 0 15px ${advantage.winner === 1 ? 'rgba(192, 10, 10, 0.3)' : 'rgba(10, 79, 212, 0.3)'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <i className={`fas ${adv.icon}`} style={{
                  fontSize: '24px',
                  color: advantage.winner === 1 ? '#c00a0a' : '#0a4fd2',
                  marginRight: '10px'
                }}></i>
                <h5 style={{ margin: '0', color: '#fff' }}>{adv.name}</h5>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{ color: '#aaa' }}>Advantage:</span>
                <div style={{
                  backgroundColor: advantage.winner === 1 ? 'rgba(192, 10, 10, 0.2)' : 'rgba(10, 79, 212, 0.2)',
                  padding: '5px 10px',
                  borderRadius: '20px',
                  color: advantage.winner === 1 ? '#ff6b6b' : '#6ba3ff',
                  fontWeight: 'bold'
                }}>
                  {advantage.winner === 1 ? fighter1 : fighter2}
                </div>
              </div>
              <div style={{ marginTop: '10px' }}>
                <div style={{
                  height: '8px',
                  backgroundColor: '#333',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, advantage.value * 10)}%`,
                    background: advantage.winner === 1
                      ? 'linear-gradient(90deg, #a00, #f00)'
                      : 'linear-gradient(90deg, #006, #00a)',
                    borderRadius: '4px'
                  }}></div>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '5px',
                  fontSize: '12px',
                  color: '#aaa'
                }}>
                  <span>{stats1[adv.key] || 0}</span>
                  <span>{stats2[adv.key] || 0}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{
      padding: '20px',
      background: 'linear-gradient(to bottom, #0a0a0a, #1a1a1a)',
      minHeight: '100vh'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '20px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
          borderBottom: '2px solid #333',
          paddingBottom: '20px'
        }}>
          <h1 style={{
            margin: '0',
            color: '#fff',
            fontSize: '2.5rem',
            fontWeight: '700',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)'
          }}>
            <i className="fas fa-balance-scale" style={{ marginRight: '15px', color: '#d4af37' }}></i>
            Fighter Comparison Tool
          </h1>
          <div style={{
            background: 'linear-gradient(90deg, #c00a0a, #0a4fd2)',
            padding: '5px 15px',
            borderRadius: '20px',
            fontWeight: '600',
            fontSize: '0.9rem'
          }}>
            UFC PERFORMANCE ANALYTICS
          </div>
        </div>

        {/* Search Section */}
        <div style={{
          backgroundColor: '#1a1a1a',
          borderRadius: '12px',
          padding: '25px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          marginBottom: '30px'
        }}>
          <h2 style={{
            color: '#fff',
            marginBottom: '25px',
            textAlign: 'center',
            fontWeight: '600',
            fontSize: '1.8rem'
          }}>
            Select Fighters to Compare
          </h2>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '30px',
            marginBottom: '20px'
          }}>
            <div style={{ flex: '1', minWidth: '300px' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '10px',
                  fontWeight: '600',
                  color: '#ddd',
                  fontSize: '1.1rem'
                }}>
                  <i className="fas fa-fist-raised" style={{ marginRight: '10px', color: '#c00a0a' }}></i>
                  Red Corner Fighter
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    style={{
                      backgroundColor: 'rgba(30, 30, 30, 0.8)',
                      border: '1px solid #444',
                      color: '#f5f5f5',
                      padding: '15px 20px',
                      borderRadius: '10px',
                      width: '100%',
                      fontSize: '16px',
                      boxShadow: '0 0 10px rgba(192, 10, 10, 0.2)'
                    }}
                    value={fighter1}
                    onChange={(e) => handleSearch1(e.target.value)}
                    placeholder="Enter fighter name"
                  />
                  {showResults1 && searchResults1.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      width: '100%',
                      backgroundColor: '#222',
                      border: '1px solid #c00a0a',
                      borderRadius: '8px',
                      zIndex: 1000,
                      maxHeight: '250px',
                      overflowY: 'auto',
                      marginTop: '5px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                    }}>
                      {searchResults1.map((fighter, index) => (
                        <div
                          key={index}
                          style={{
                            padding: '12px 20px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #444',
                            color: '#fff',
                            transition: 'background-color 0.2s',
                            background: 'linear-gradient(to right, rgba(30, 30, 30, 0.8), rgba(50, 50, 50, 0.8))'
                          }}
                          onClick={() => handleSelectFighter1(fighter)}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#333'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <i className="fas fa-user" style={{ marginRight: '10px' }}></i>
                          {fighter}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flex: '0 0 auto'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '80px',
                height: '80px',
                background: 'linear-gradient(135deg, #c00a0a, #0a4fd2)',
                color: 'white',
                fontWeight: '800',
                fontSize: '1.8rem',
                borderRadius: '50%',
                boxShadow: '0 0 20px rgba(210, 10, 10, 0.5), 0 0 30px rgba(10, 63, 210, 0.5)',
                border: '3px solid #d4af37'
              }}>
                VS
              </div>
            </div>

            <div style={{ flex: '1', minWidth: '300px' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '10px',
                  fontWeight: '600',
                  color: '#ddd',
                  fontSize: '1.1rem'
                }}>
                  <i className="fas fa-shield-alt" style={{ marginRight: '10px', color: '#0a4fd2' }}></i>
                  Blue Corner Fighter
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    style={{
                      backgroundColor: 'rgba(30, 30, 30, 0.8)',
                      border: '1px solid #444',
                      color: '#f5f5f5',
                      padding: '15px 20px',
                      borderRadius: '10px',
                      width: '100%',
                      fontSize: '16px',
                      boxShadow: '0 0 10px rgba(10, 79, 212, 0.2)'
                    }}
                    value={fighter2}
                    onChange={(e) => handleSearch2(e.target.value)}
                    placeholder="Enter fighter name"
                  />
                  {showResults2 && searchResults2.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      width: '100%',
                      backgroundColor: '#222',
                      border: '1px solid #0a4fd2',
                      borderRadius: '8px',
                      zIndex: 1000,
                      maxHeight: '250px',
                      overflowY: 'auto',
                      marginTop: '5px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                    }}>
                      {searchResults2.map((fighter, index) => (
                        <div
                          key={index}
                          style={{
                            padding: '12px 20px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #444',
                            color: '#fff',
                            transition: 'background-color 0.2s',
                            background: 'linear-gradient(to right, rgba(30, 30, 30, 0.8), rgba(50, 50, 50, 0.8))'
                          }}
                          onClick={() => handleSelectFighter2(fighter)}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#333'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <i className="fas fa-user" style={{ marginRight: '10px' }}></i>
                          {fighter}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <button
              style={{
                background: 'linear-gradient(to right, #c00a0a, #0a4fd2)',
                border: 'none',
                borderRadius: '8px',
                padding: '15px 40px',
                fontSize: '1.2rem',
                fontWeight: '700',
                color: 'white',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
                marginTop: '10px',
                opacity: (!fighter1 || !fighter2 || loading) ? 0.6 : 1,
                position: 'relative',
                overflow: 'hidden'
              }}
              onClick={handleSearch}
              disabled={!fighter1 || !fighter2 || loading}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin" style={{ marginRight: '10px' }}></i>
                  ANALYZING FIGHTERS...
                </>
              ) : (
                <>
                  <i className="fas fa-search" style={{ marginRight: '10px' }}></i>
                  COMPARE FIGHTERS
                </>
              )}
            </button>
          </div>
        </div>

        {(stats1 && stats2) && (
          <div>
            {/* Stats Comparison */}
            <div style={{
              backgroundColor: '#1a1a1a',
              borderRadius: '12px',
              padding: '30px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              marginBottom: '30px'
            }}>
              <h2 style={{
                color: '#fff',
                marginBottom: '30px',
                textAlign: 'center',
                fontWeight: '600',
                fontSize: '1.8rem',
                position: 'relative',
                paddingBottom: '15px'
              }}>
                <span style={{
                  position: 'absolute',
                  bottom: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '80px',
                  height: '4px',
                  background: 'linear-gradient(90deg, #c00a0a, #0a4fd2)',
                  borderRadius: '2px'
                }}></span>
                STATISTICAL COMPARISON
              </h2>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px' }}>
                <div style={{ flex: '1', minWidth: '300px' }}>
                  <div style={{
                    background: 'linear-gradient(to bottom, #2a0a0a, #1a0a0a)',
                    padding: '20px',
                    borderRadius: '12px',
                    borderLeft: '5px solid #c00a0a',
                    marginBottom: '20px',
                    boxShadow: '0 5px 15px rgba(0,0,0,0.3)'
                  }}>
                    <h3 style={{
                      textAlign: 'center',
                      color: '#ffffff',
                      marginBottom: '0',
                      fontSize: '1.5rem',
                      fontWeight: '700'
                    }}>
                      {fighter1}
                    </h3>
                  </div>
                  <div style={{
                    backgroundColor: 'rgba(30, 30, 30, 0.8)',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid #444',
                    boxShadow: '0 5px 15px rgba(0,0,0,0.2)'
                  }}>
                    {statFields.map(field => (
                      <div
                        key={field.key}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '12px 0',
                          borderBottom: '1px solid #333',
                          position: 'relative'
                        }}
                      >
                        <span style={{ color: '#e0e0e0', fontWeight: '500' }}>{field.label}:</span>
                        <span style={{
                          fontWeight: 'bold',
                          color: '#ffffff',
                          minWidth: '70px',
                          textAlign: 'right'
                        }}>
                          {stats1[field.key] || 'N/A'}
                        </span>
                        {stats1[field.key] > stats2[field.key] && (
                          <div style={{
                            position: 'absolute',
                            right: '-25px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#c00a0a',
                            fontSize: '20px'
                          }}>
                            <i className="fas fa-arrow-up"></i>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ flex: '1', minWidth: '300px' }}>
                  <div style={{
                    background: 'linear-gradient(to bottom, #0a0a2a, #0a0a1a)',
                    padding: '20px',
                    borderRadius: '12px',
                    borderLeft: '5px solid #0a4fd2',
                    marginBottom: '20px',
                    boxShadow: '0 5px 15px rgba(0,0,0,0.3)'
                  }}>
                    <h3 style={{
                      textAlign: 'center',
                      color: '#ffffff',
                      marginBottom: '0',
                      fontSize: '1.5rem',
                      fontWeight: '700'
                    }}>
                      {fighter2}
                    </h3>
                  </div>
                  <div style={{
                    backgroundColor: 'rgba(30, 30, 30, 0.8)',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid #444',
                    boxShadow: '0 5px 15px rgba(0,0,0,0.2)'
                  }}>
                    {statFields.map(field => (
                      <div
                        key={field.key}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '12px 0',
                          borderBottom: '1px solid #333',
                          position: 'relative'
                        }}
                      >
                        <span style={{ color: '#e0e0e0', fontWeight: '500' }}>{field.label}:</span>
                        <span style={{
                          fontWeight: 'bold',
                          color: '#ffffff',
                          minWidth: '70px',
                          textAlign: 'right'
                        }}>
                          {stats2[field.key] || 'N/A'}
                        </span>
                        {stats2[field.key] > stats1[field.key] && (
                          <div style={{
                            position: 'absolute',
                            right: '-25px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#0a4fd2',
                            fontSize: '20px'
                          }}>
                            <i className="fas fa-arrow-up"></i>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Comparison */}
            <div style={{
              backgroundColor: '#1a1a1a',
              borderRadius: '12px',
              padding: '30px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              marginBottom: '30px'
            }}>
              <h2 style={{
                color: '#fff',
                marginBottom: '30px',
                textAlign: 'center',
                fontWeight: '600',
                fontSize: '1.8rem',
                position: 'relative',
                paddingBottom: '15px'
              }}>
                <span style={{
                  position: 'absolute',
                  bottom: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '80px',
                  height: '4px',
                  background: 'linear-gradient(90deg, #c00a0a, #0a4fd2)',
                  borderRadius: '2px'
                }}></span>
                VISUAL ANALYSIS
              </h2>

              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '30px',
                marginBottom: '40px'
              }}>
                <div style={{ flex: '1', minWidth: '300px' }}>
                  <h3 style={{
                    textAlign: 'center',
                    color: '#fff',
                    marginBottom: '20px',
                    fontWeight: '600'
                  }}>
                    KEY METRICS COMPARISON
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '20px'
                  }}>
                    {['height', 'reach', 'avg_sig_str', 'avg_td_pct', 'win_streak', 'ko_wins'].map(metric => (
                      <div key={metric} style={{
                        backgroundColor: '#1a1a1a',
                        padding: '20px',
                        borderRadius: '12px',
                        border: '1px solid #444',
                        boxShadow: '0 5px 15px rgba(0,0,0,0.2)'
                      }}>
                        <h5 style={{
                          textAlign: 'center',
                          marginBottom: '20px',
                          color: '#fff',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '1px'
                        }}>
                          {metric.replace(/_/g, ' ')}
                        </h5>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '15px'
                        }}>
                          <div style={{ textAlign: 'center', width: '45%' }}>
                            <div style={{
                              background: 'linear-gradient(to bottom, #2a0a0a, #1a0a0a)',
                              padding: '15px',
                              borderRadius: '10px',
                              fontSize: '1.8rem',
                              fontWeight: 'bold',
                              color: '#ffffff',
                              boxShadow: '0 5px 15px rgba(0,0,0,0.3)'
                            }}>
                              {stats1[metric] || 0}
                            </div>
                            <small style={{
                              color: '#aaa',
                              display: 'block',
                              marginTop: '5px'
                            }}>{fighter1}</small>
                          </div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '50px',
                            height: '50px',
                            background: 'linear-gradient(135deg, #c00a0a, #0a4fd2)',
                            color: 'white',
                            fontWeight: '800',
                            fontSize: '1.5rem',
                            borderRadius: '50%',
                            boxShadow: '0 0 15px rgba(210, 10, 10, 0.4), 0 0 20px rgba(10, 63, 210, 0.4)',
                            border: '2px solid #d4af37'
                          }}>
                            VS
                          </div>
                          <div style={{ textAlign: 'center', width: '45%' }}>
                            <div style={{
                              background: 'linear-gradient(to bottom, #0a0a2a, #0a0a1a)',
                              padding: '15px',
                              borderRadius: '10px',
                              fontSize: '1.8rem',
                              fontWeight: 'bold',
                              color: '#ffffff',
                              boxShadow: '0 5px 15px rgba(0,0,0,0.3)'
                            }}>
                              {stats2[metric] || 0}
                            </div>
                            <small style={{
                              color: '#aaa',
                              display: 'block',
                              marginTop: '5px'
                            }}>{fighter2}</small>
                          </div>
                        </div>
                        {typeof stats1[metric] === 'number' && typeof stats2[metric] === 'number' && (
                          <div style={{
                            height: '12px',
                            backgroundColor: '#333',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            marginTop: '15px',
                            boxShadow: 'inset 0 0 5px rgba(0,0,0,0.5)'
                          }}>
                            <div
                              style={{
                                height: '100%',
                                background: 'linear-gradient(90deg, #a00, #f00)',
                                borderRadius: '6px',
                                width: `${(stats1[metric]/(stats1[metric] + stats2[metric])) * 100}%`,
                                float: 'left'
                              }}
                            ></div>
                            <div
                              style={{
                                height: '100%',
                                background: 'linear-gradient(90deg, #006, #00a)',
                                borderRadius: '6px',
                                width: `${(stats2[metric]/(stats1[metric] + stats2[metric])) * 100}%`,
                                float: 'right'
                              }}
                            ></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ flex: '1', minWidth: '300px' }}>
                  <h3 style={{
                    textAlign: 'center',
                    color: '#fff',
                    marginBottom: '20px',
                    fontWeight: '600'
                  }}>
                    SKILLS RADAR CHART
                  </h3>
                  {renderRadarChart()}
                  <p style={{
                    textAlign: 'center',
                    color: '#aaa',
                    marginTop: '20px',
                    fontSize: '0.9rem'
                  }}>
                    The radar chart visualizes each fighter's strengths across key skill categories.
                    The larger the area, the more dominant the fighter in that category.
                  </p>
                </div>
              </div>

              {/* Advantage Indicators */}
              {renderAdvantageCards()}
            </div>

            {/* Final Comparison */}
            <div style={{
              backgroundColor: '#1a1a1a',
              borderRadius: '12px',
              padding: '30px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              textAlign: 'center'
            }}>
              <h2 style={{
                color: '#fff',
                marginBottom: '20px',
                fontWeight: '600',
                fontSize: '1.8rem'
              }}>
                FINAL COMPARISON ANALYSIS
              </h2>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '40px',
                marginTop: '30px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '120px',
                    height: '120px',
                    background: 'linear-gradient(135deg, #2a0a0a, #1a0a0a)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    border: '3px solid #c00a0a',
                    boxShadow: '0 0 20px rgba(192, 10, 10, 0.4)'
                  }}>
                    <span style={{
                      fontSize: '2.5rem',
                      fontWeight: '700',
                      color: '#fff'
                    }}>
                      {Object.keys(stats1).filter(key =>
                        statFields.some(f => f.key === key) &&
                        stats1[key] > stats2[key]
                      ).length}
                    </span>
                  </div>
                  <h3 style={{ color: '#fff', marginBottom: '10px' }}>{fighter1}</h3>
                  <p style={{ color: '#aaa' }}>Categories Won</p>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div style={{
                    fontSize: '2rem',
                    fontWeight: '700',
                    color: '#d4af37',
                    backgroundColor: '#1a1a1a',
                    padding: '10px 30px',
                    borderRadius: '10px',
                    border: '2px solid #d4af37'
                  }}>
                    VS
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '120px',
                    height: '120px',
                    background: 'linear-gradient(135deg, #0a0a2a, #0a0a1a)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    border: '3px solid #0a4fd2',
                    boxShadow: '0 0 20px rgba(10, 79, 212, 0.4)'
                  }}>
                    <span style={{
                      fontSize: '2.5rem',
                      fontWeight: '700',
                      color: '#fff'
                    }}>
                      {Object.keys(stats2).filter(key =>
                        statFields.some(f => f.key === key) &&
                        stats2[key] > stats1[key]
                      ).length}
                    </span>
                  </div>
                  <h3 style={{ color: '#fff', marginBottom: '10px' }}>{fighter2}</h3>
                  <p style={{ color: '#aaa' }}>Categories Won</p>
                </div>
              </div>

              <div style={{
                marginTop: '40px',
                padding: '20px',
                background: 'linear-gradient(90deg, rgba(192, 10, 10, 0.1), rgba(10, 79, 212, 0.1))',
                borderRadius: '10px',
                border: '1px solid #333'
              }}>
                <h3 style={{ color: '#d4af37', marginBottom: '15px' }}>
                  <i className="fas fa-lightbulb" style={{ marginRight: '10px' }}></i>
                  Key Insights
                </h3>
                <ul style={{
                  textAlign: 'left',
                  paddingLeft: '20px',
                  color: '#fff'
                }}>
                  <li style={{ marginBottom: '10px' }}>
                    <strong style={{ color: '#c00a0a' }}>{fighter1}</strong> has the advantage in striking power with <strong>{stats1.avg_sig_str || 0}</strong> significant strikes per minute.
                  </li>
                  <li style={{ marginBottom: '10px' }}>
                    <strong style={{ color: '#0a4fd2' }}>{fighter2}</strong> has superior grappling with a <strong>{stats2.avg_td_pct || 0}%</strong> takedown accuracy.
                  </li>
                  <li style={{ marginBottom: '10px' }}>
                    With <strong>{stats1.total_fights || 0}</strong> fights, <strong style={{ color: '#c00a0a' }}>{fighter1}</strong> has more experience in the octagon.
                  </li>
                  <li>
                    <strong style={{ color: '#0a4fd2' }}>{fighter2}</strong> is on a <strong>{stats2.win_streak || 0}</strong> fight win streak coming into this matchup.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FighterComparison;
