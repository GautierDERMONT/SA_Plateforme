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

// Auth
export const login = (email, password) => api.post('/api/login', { email, password });
export const register = (email, password, full_name) => api.post('/api/register', { email, password, full_name });
export const getMe = () => api.get('/api/me');
export const deleteMyAccount = () => api.delete('/api/me'); 

// Data - Préfixe /api ajouté
export const getData = () => api.get('/api/data');
export const getItem = (id) => api.get(`/api/data/${id}`);
export const createData = (data) => api.post('/api/data', data);
export const updateData = (id, data) => api.put(`/api/data/${id}`, data);
export const deleteData = (id) => api.delete(`/api/data/${id}`);

// Admin - Users - Préfixe /api ajouté
export const getUsers = () => api.get('/api/admin/users');
export const createUser = (userData) => api.post('/api/admin/users', userData);
export const deleteUser = (userId) => api.delete(`/api/admin/users/${userId}`);

export default api;