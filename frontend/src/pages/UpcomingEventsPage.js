import React, { useState, useEffect } from 'react';
import { getUpcomingEvents } from '../services/api';

const UpcomingEventsPage = ({ onNavigateToPredict }) => {
  const [events, setEvents]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    getUpcomingEvents()
      .then(res => {
        const grouped = {};
        res.data.events.forEach(fight => {
          if (!grouped[fight.event_name]) {
            grouped[fight.event_name] = {
              event_name: fight.event_name,
              event_date: fight.event_date,
              location:   fight.location,
              fights:     []
            };
          }
          grouped[fight.event_name].fights.push(fight);
        });
        const groupedArr = Object.values(grouped);
        setEvents(groupedArr);
        if (groupedArr.length > 0) {
          setExpanded({ [groupedArr[0].event_name]: true });
        }
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (name) =>
    setExpanded(prev => ({ ...prev, [name]: !prev[name] }));

  // Detect if a fight is likely a title bout or main event (5 rounds)
  const isTitleFight = (eventName, index, totalFights) => {
    const name = eventName.toLowerCase();
    return name.includes('title') || name.includes('championship') || index === 0;
  };

  const getRounds = (eventName, index) => {
    // Main event (index 0) or title fights get 5 rounds, rest get 3
    return isTitleFight(eventName, index) ? 5 : 3;
  };

  if (loading) return (
    <div className="text-center py-5">
      <span className="spinner-border text-danger" role="status"></span>
      <p className="mt-3 text-muted">Loading live UFC events...</p>
    </div>
  );

  return (
    <div className="w-100 py-4">
      <div className="card w-100" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="card-header bg-dark d-flex justify-content-between align-items-center">
          <div>
            <h1 className="mb-0">UPCOMING UFC EVENTS</h1>
            <p className="mb-0 text-light">Live fight cards from ufcstats.com</p>
          </div>
          <span className="badge bg-danger" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            ● LIVE DATA
          </span>
        </div>

        <div className="card-body">
          {!events.length
            ? <div className="alert alert-secondary">No upcoming events found.</div>
            : events.map(event => (
              <div key={event.event_name} className="card mb-3" style={{ border: '1px solid #333' }}>
                <div
                  className="card-header bg-dark d-flex justify-content-between align-items-center"
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggle(event.event_name)}
                >
                  <div>
                    <h5 className="mb-0 text-white">{event.event_name}</h5>
                    <small className="text-muted">{event.event_date} · {event.location}</small>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-secondary">{event.fights.length} fights</span>
                    <span className="text-white">{expanded[event.event_name] ? '▲' : '▼'}</span>
                  </div>
                </div>

                {expanded[event.event_name] && (
                  <div className="card-body p-0">
                    <table className="table table-dark table-hover mb-0">
                      <thead>
                        <tr>
                          <th className="ps-3">Red Corner</th>
                          <th className="text-center">VS</th>
                          <th>Blue Corner</th>
                          <th>Division</th>
                          <th className="text-center">Rounds</th>
                          <th className="text-center">Predict</th>
                        </tr>
                      </thead>
                      <tbody>
                        {event.fights.map((fight, i) => {
                          const fightRounds   = getRounds(event.event_name, i);
                          const fightTitleBout = isTitleFight(event.event_name, i);
                          return (
                            <tr key={i}>
                              <td className="ps-3 text-danger fw-bold">{fight.red_fighter}</td>
                              <td className="text-center text-muted">vs</td>
                              <td className="text-primary fw-bold">{fight.blue_fighter}</td>
                              <td><span className="badge bg-secondary">{fight.weight_class}</span></td>
                              <td className="text-center">
                                <span className={`badge ${fightRounds === 5 ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                                  {fightRounds}R {fightTitleBout ? '🏆' : ''}
                                </span>
                              </td>
                              <td className="text-center">
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => {
                                    window.dispatchEvent(new CustomEvent('navigateToPredict', {
                                      detail: {
                                        red:       fight.red_fighter,
                                        blue:      fight.blue_fighter,
                                        rounds:    fightRounds,
                                        titleBout: fightTitleBout
                                      }
                                    }));
                                  }}
                                >
                                  Predict →
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
};

export default UpcomingEventsPage;
