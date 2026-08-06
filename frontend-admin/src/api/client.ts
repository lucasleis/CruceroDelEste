import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

// Session is carried by the httpOnly `admin_token` cookie (set by
// POST /admin/login) alongside `withCredentials: true` above — there is no
// token in JS-accessible storage, and never should be (LLE-334).
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
