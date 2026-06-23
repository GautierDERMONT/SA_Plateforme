// services/api.js
import axios from 'axios';

// URL backend sur Render
const API_URL = 'https://sa-plateforme-backend.onrender.com';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token à chaque requête
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth - Ajout du préfixe /api pour correspondre au backend FastAPI
export const login = (email, password) => api.post('/api/login', { email, password });
export const register = (email, password, full_name) => api.post('/api/register', { email, password, full_name });
export const getMe = () => api.get('/api/me');
export const deleteMyAccount = () => api.delete('/api/me'); 

// Data
export const getData = () => api.get('/data');
export const getItem = (id) => api.get(`/data/${id}`);
export const createData = (data) => api.post('/data', data);
export const updateData = (id, data) => api.put(`/data/${id}`, data);
export const deleteData = (id) => api.delete(`/data/${id}`);

// Admin - Users
export const getUsers = () => api.get('/admin/users');
export const createUser = (userData) => api.post('/admin/users', userData);
export const deleteUser = (userId) => api.delete(`/admin/users/${userId}`);

export default api;