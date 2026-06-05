import axios from 'axios';

// Create a configured instance of Axios
const API = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL, // Loads dynamically from your .env
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Automatically injects the JWT token into headers if the user is logged in
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('aura_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default API;