import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api', // Points to our Node.js server
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;