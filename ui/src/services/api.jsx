const API_BASE = 'http://localhost:5000/api';// Vite proxy will handle this // Direct connection to Flask

export const searchFighters = async (term) => {
  try {
    const response = await fetch(`${API_BASE}/search_fighters?term=${encodeURIComponent(term)}`, {
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Search failed: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Search fighters error:', error);
    throw new Error('Failed to search fighters. Please try again.');
  }
};

export const getFighterStats = async (fighter) => {
  try {
    const response = await fetch(`${API_BASE}/get_fighter_stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `fighter=${encodeURIComponent(fighter)}`,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get stats: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Get fighter stats error:', error);
    throw new Error('Failed to load fighter stats. Please try again.');
  }
};

export const predictWinner = async (data) => {
  try {
    const formData = new URLSearchParams();
    for (const key in data) {
      formData.append(key, data[key]);
    }

    const response = await fetch(`${API_BASE}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Prediction failed: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Predict winner error:', error);
    throw new Error('Failed to make prediction. Please try again.');
  }
};
