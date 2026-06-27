// services/api.ts
import axios from "axios";
import { CONFIG } from "@/utils/config";
import { getToken } from "./session"; // Import this

const api = axios.create({
  baseURL: CONFIG.BASE_URL,
  timeout: 10000,
});

// attach JWT token - READ FROM SECURESTORE DIRECTLY
api.interceptors.request.use(async (config) => {
  // Read from SecureStore, not from Zustand store
  const token = await getToken();
  console.log('🔑 API Interceptor - Token:', token ? 'Found' : 'Not found');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('✅ API Interceptor - Authorization header set');
  }
  return config;
});

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', error.response?.status, error.response?.data?.message);
    return Promise.reject(error);
  }
);

// AUTH
export const loginUser = (email: string, password: string, role:string) =>
  api.post("/auth/login", { email, password, role }).then(r => r.data);

export const registerDriver = (data: {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: string;
}) => api.post("/auth/register", data).then(r => r.data);

export const getDriverProfile = async () => {
  try {
    const response = await api.get("/driver/profile-info");
    // console.log('📦 Profile response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Profile error:', error.response?.data);
    throw new Error(error.response?.data?.message || 'Failed to get driver profile');
  }
};

export const updateDriverStatus = async (isOnline: boolean) => {
  try {
    const response = await api.put("/driver/status", { isOnline });
    console.log('✅ Status updated:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Failed to update status:', error.response?.data);
    throw new Error(error.response?.data?.message || 'Failed to update driver status');
  }
};
export const updateDriverLocation = async (latitude: number, longitude: number) => {
  try {
    const response = await api.put("/driver/location", { latitude, longitude });
    console.log('📍 Location updated:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Failed to update location:', error.response?.data);
    throw new Error(error.response?.data?.message || 'Failed to update driver location');
  }
};

export const getNearbyShipments = async (lat: number, lng: number, radius: number = 5) => {
  const response = await api.post('/shipments/nearby', { lat, lng, radius }); // ← body, not params
  return response.data;
};

export const acceptShipment = async (shipmentId: string) => {
  const response = await api.post(`/shipments/${shipmentId}/accept`);
  return response.data;
};

export const getAssignedShipments = async () => {
  const response = await api.get('/shipments/assigned/assigned-to-me');
  return response.data;
};

export const getDeliveredShipments = async () => {
  const response = await api.get("/shipments/delivered/deliveredShipment");
  return response.data;
};

export const pickupShipment = async (shipmentId: string) => {
  const response = await api.post(`/shipments/${shipmentId}/pickup`);
  return response.data;
};

export const deliverShipment = async (shipmentId: string) => {
  const response = await api.post(`/shipments/${shipmentId}/deliver`);
  return response.data;
};

export const getShipmentInterests = (shipmentId: string) =>
  api.get(`/shipments/${shipmentId}/interests`).then((r) => r.data.interests);

export const cancelShipment = async (shipmentId: string, data: { cancellationReason: string }) => {
  const response = await api.put(`/shipments/${shipmentId}/cancel`, data);
  return response.data;
};

export const getShipmentsByPickupRadius = async (lat: number, lng: number, radius: number = 5) => {
    console.log("near by adius lat",lat, "lng",lng, );

  try {
    const response = await api.get('/shipments/nearby-by-radius', { lat, lng, radius });
    console.log('📦 by pick up radius shipments  response:', response.data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to get shipments');
  }
};

export default api;