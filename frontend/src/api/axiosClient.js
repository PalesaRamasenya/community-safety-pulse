import axios from 'axios';
import { auth } from '../firebase';

const axiosClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001',
  timeout: 10000
});

// Attach the current Firebase ID token (if logged in) to every request,
// so the backend's verifyFirebaseToken middleware can authorize admin routes.
axiosClient.interceptors.request.use(async (config) => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    const token = await currentUser.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosClient;
