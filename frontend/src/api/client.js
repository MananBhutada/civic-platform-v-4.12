import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const client = axios.create({ baseURL: BASE_URL });

// Alias — some pages (e.g. PublicFeed.jsx) import the axios instance as `api`.
export { client as api };

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('civic_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('civic_token');
      localStorage.removeItem('civic_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// Unwraps { error } shaped failures into a readable message
export function apiError(err, fallback = 'Something went wrong. Please try again.') {
  return err?.response?.data?.error || err?.response?.data?.errors?.[0]?.msg || fallback;
}

// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
  register: (payload) => client.post('/auth/register', payload),
  verifyRegisterOtp: (payload) => client.post('/auth/verify-otp', payload),
  login: (payload) => client.post('/auth/login', payload),
  verifyLoginOtp: (payload) => client.post('/auth/verify-login-otp', payload),
  resendOtp: (payload) => client.post('/auth/resend-otp', payload),
  logout: () => client.post('/auth/logout'),
};

// ── Complaints ────────────────────────────────────────────────
export const complaintsApi = {
  list: (params) => client.get('/complaints', { params }),
  my: (params) => client.get('/complaints/my', { params }),
  search: (params) => client.get('/complaints/search', { params }),
  get: (id) => client.get(`/complaints/${id}`),
  create: (payload) => client.post('/complaints', payload),
  update: (id, payload) => client.put(`/complaints/${id}`, payload),
  remove: (id) => client.delete(`/complaints/${id}`),
  updateStatus: (id, payload) => client.put(`/complaints/${id}/status`, payload),
  upvote: (id) => client.post(`/complaints/${id}/upvote`),
  feedback: (id, payload) => client.post(`/complaints/${id}/feedback`, payload),
  allowedTransitions: (id) => client.get(`/complaints/${id}/allowed-transitions`),
  assignOfficer: (id, payload) => client.put(`/complaints/${id}/assign-officer`, payload),
  reassign: (id, payload) => client.put(`/complaints/${id}/reassign`, payload),
  accept: (id) => client.put(`/complaints/${id}/accept`),
  startWork: (id, payload) => client.put(`/complaints/${id}/start-work`, payload),
  submitInspection: (id, payload) => client.put(`/complaints/${id}/submit-inspection`, payload),
  resolve: (id, payload) => client.put(`/complaints/${id}/resolve`, payload),
  citizenVerify: (id, payload) => client.put(`/complaints/${id}/citizen-verify`, payload),
  // ── Image verification + geo-routing pipeline (new, additive) ──
  // Sends the raw file + GPS/device metadata as multipart/form-data to
  // POST /complaints/verified (imageVerificationController.js on the backend).
  createVerified: (formData) => client.post('/complaints/verified', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// ── Admin: manual review queue (image trust score 60-79) ────────
export const reviewQueueApi = {
  list: (params) => client.get('/admin/review-queue', { params }),
  approve: (id) => client.post(`/admin/review-queue/${id}/approve`),
  reject: (id, reason) => client.post(`/admin/review-queue/${id}/reject`, { reason }),
};

// ── Evidence ──────────────────────────────────────────────────
export const evidenceApi = {
  upload: (id, payload) => client.post(`/complaints/${id}/evidence`, payload),
  list: (id) => client.get(`/complaints/${id}/evidence`),
};

// ── Community ─────────────────────────────────────────────────
export const communityApi = {
  addComment: (id, payload) => client.post(`/complaints/${id}/comments`, payload),
  listComments: (id) => client.get(`/complaints/${id}/comments`),
  toggleBookmark: (id) => client.post(`/complaints/${id}/bookmark`),
  listBookmarks: () => client.get('/citizen/bookmarks'),
  nearby: (params) => client.get('/citizen/nearby', { params }),
};

// ── Citizen ───────────────────────────────────────────────────
export const citizenApi = {
  dashboard: () => client.get('/citizen/dashboard'),
};

// ── Upload ────────────────────────────────────────────────────
export const uploadApi = {
  complaintImage: (file) => {
    const fd = new FormData();
    fd.append('image', file);
    return client.post('/upload/complaint-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  proofImage: (complaintId, file, remarks) => {
    const fd = new FormData();
    fd.append('proof_image', file); // must match backend multer field: uploadProofImage.single('proof_image')
    if (remarks) fd.append('remarks', remarks);
    return client.post(`/upload/proof-image/${complaintId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  avatar: (file) => {
    const fd = new FormData();
    fd.append('avatar', file);
    return client.post('/upload/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  complaintImages: (complaintId) => client.get(`/upload/complaint-images/${complaintId}`),
};

// ── Officers ──────────────────────────────────────────────────
export const officersApi = {
  create: (payload) => client.post('/officers', payload),
  list: (params) => client.get('/officers', { params }),
  workload: (id) => client.get(`/officers/${id}/workload`),
  performance: (id) => client.get(`/officers/${id}/performance`),
  setAvailability: (id, is_available) => client.put(`/officers/${id}/availability`, { is_available }),
  requestLeave: (payload) => client.post('/officers/leave', payload),
  listLeaves: (params) => client.get('/officers/leave', { params }),
  reviewLeave: (id, decision) => client.put(`/officers/leave/${id}/review`, { decision }),
};

// ── Admin ─────────────────────────────────────────────────────
export const adminApi = {
  dashboard: (params) => client.get('/admin/dashboard', { params }),
  assignDepartment: (id, department_id) => client.put(`/admin/complaints/${id}/assign`, { department_id }),
  departments: () => client.get('/admin/departments'),
  mlStatus: () => client.get('/admin/ml-status'),
  recalculatePriorities: () => client.post('/admin/recalculate-priorities'),
  cityAnalytics: (params) => client.get('/analytics/city', { params }),
};

// ── Audit ─────────────────────────────────────────────────────
export const auditApi = {
  list: (params) => client.get('/admin/audit-logs', { params }),
};

// ── Geo ───────────────────────────────────────────────────────
export const geoApi = {
  complaintsGeoJSON: (params) => client.get('/geo/complaints', { params }),
  heatmap: (params) => client.get('/geo/heatmap', { params }),
  wardStats: () => client.get('/geo/ward-stats'),
  searchAddress: (q) => client.get('/geo/search-address', { params: { q } }),
};

// ── Governance analytics ─────────────────────────────────────
export const govAnalyticsApi = {
  civicHealth: (params) => client.get('/analytics/civic-health', { params }),
  civicHealthHistory: (params) => client.get('/analytics/civic-health/history', { params }),
  departmentEfficiency: (params) => client.get('/analytics/department-efficiency', { params }),
  hotspots: (params) => client.get('/analytics/hotspots', { params }),
  trustScore: () => client.get('/analytics/trust-score'),
  exportCsvUrl: (params) => {
    const qs = new URLSearchParams(params || {}).toString();
    return `${BASE_URL}/analytics/export.csv${qs ? `?${qs}` : ''}`;
  },
};

// ── Global search ─────────────────────────────────────────────
export const searchApi = {
  global: (q) => client.get('/search/global', { params: { q } }),
};

// ── Notifications ────────────────────────────────────────────
export const notificationsApi = {
  list: (params) => client.get('/notifications', { params }),
  markRead: (id) => client.put(`/notifications/${id}/read`),
  markAllRead: () => client.put('/notifications/read-all'),
};

export { BASE_URL };
