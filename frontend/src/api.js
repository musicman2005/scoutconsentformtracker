import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "/api",
});

// Groups
export const getGroups = () => api.get("/groups").then((r) => r.data);
export const createGroup = (data) => api.post("/groups", data).then((r) => r.data);
export const updateGroup = (id, data) => api.put(`/groups/${id}`, data).then((r) => r.data);
export const deleteGroup = (id) => api.delete(`/groups/${id}`);

// Scouts
export const getScouts = (params) => api.get("/scouts", { params }).then((r) => r.data);
export const getScout = (id) => api.get(`/scouts/${id}`).then((r) => r.data);
export const createScout = (data) => api.post("/scouts", data).then((r) => r.data);
export const updateScout = (id, data) => api.put(`/scouts/${id}`, data).then((r) => r.data);
export const deleteScout = (id) => api.delete(`/scouts/${id}`);
export const getScoutGuardians = (id) => api.get(`/scouts/${id}/guardians`).then((r) => r.data);

// Guardians
export const getGuardians = () => api.get("/guardians").then((r) => r.data);
export const createGuardian = (data) => api.post("/guardians", data).then((r) => r.data);
export const updateGuardian = (id, data) => api.put(`/guardians/${id}`, data).then((r) => r.data);
export const deleteGuardian = (id) => api.delete(`/guardians/${id}`);

// Forms
export const getForms = () => api.get("/forms").then((r) => r.data);
export const createForm = (data) => api.post("/forms", data).then((r) => r.data);
export const updateForm = (id, data) => api.put(`/forms/${id}`, data).then((r) => r.data);
export const deleteForm = (id) => api.delete(`/forms/${id}`);

// Signing Requests
export const getSigningRequests = () => api.get("/signing-requests").then((r) => r.data);
export const createSigningRequest = (data) => api.post("/signing-requests", data).then((r) => r.data);
export const updateSigningRequest = (id, data) => api.put(`/signing-requests/${id}`, data).then((r) => r.data);
export const deleteSigningRequest = (id) => api.delete(`/signing-requests/${id}`);
export const sendSigningRequest = (id) => api.post(`/signing-requests/${id}/send`).then((r) => r.data);
export const sendReminder = (id) => api.post(`/signing-requests/${id}/remind`).then((r) => r.data);
export const markSigned = (id) => api.post(`/signing-requests/${id}/mark-signed`).then((r) => r.data);

// Dashboard
export const getDashboardStats = () => api.get("/dashboard/stats").then((r) => r.data);
