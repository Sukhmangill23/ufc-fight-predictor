import axios from 'axios';


const API_BASE = 'http://localhost:5001';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
});

export const searchFighters = (term) =>
  api.get(`/search_fighters?term=${term}`);

export const getFighterStats = (fighter) =>
  api.post(`/get_fighter_stats`, `fighter=${fighter}`);

export const predictFight = (data) => {
  const formData = new URLSearchParams();
  formData.append('red_fighter', data.red_fighter);
  formData.append('blue_fighter', data.blue_fighter);
  formData.append('number_of_rounds', data.number_of_rounds);
  formData.append('title_bout', data.title_bout);

  return api.post(`/predict`, formData);
};

export const getPredictionInsights = (data) => {
  const formData = new URLSearchParams();
  formData.append('red_fighter', data.red_fighter);
  formData.append('blue_fighter', data.blue_fighter);
  formData.append('number_of_rounds', data.number_of_rounds);
  formData.append('title_bout', data.title_bout);

  return api.post(`/prediction_insights`, formData);
};

export const getFighterAnalytics = () => {
  return api.get(`/fighter_analytics`);
};

export const getPredictionHistory = () => {
  return api.get(`/prediction_history`);
};

export const getFighterAnalyticsDetails = (fighter) => {
  const formData = new URLSearchParams();
  formData.append('fighter', fighter);
  return api.post(`/fighter_analytics_details`, formData);
};
