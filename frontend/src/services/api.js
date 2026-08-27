import { Platform } from 'react-native';

// Replace with your laptop's local Wi-Fi IP address when testing on a real Android phone
const LOCAL_WIFI_IP = '192.168.1.50'; 

// Android Emulator uses 10.0.2.2 to reach host localhost (0.0.0.0:8000)
export const BASE_URL =
  Platform.OS === 'web'
    ? 'http://localhost:8000/api'
    : Platform.OS === 'android'
    ? 'http://10.0.2.2:8000/api'
    : 'http://192.168.1.50:8000/api';

export const apiFetch = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP Error Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Fetch Error [${endpoint}]:`, error);
    throw error;
  }
};
