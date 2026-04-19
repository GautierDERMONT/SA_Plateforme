import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const healthCheck = () => api.get('/health');
export const getData = () => api.get('/data');
export const getItem = (id) => api.get(`/data/${id}`);
export const createData = (data) => api.post('/data', data);
export const updateData = (id, data) => api.put(`/data/${id}`, data);
export const deleteData = (id) => api.delete(`/data/${id}`);

export default api;