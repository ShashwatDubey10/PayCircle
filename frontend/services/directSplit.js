import api from '@/services/api';

export const getDirectSplits = (friendId) =>
  api.get(`/api/users/me/direct/${friendId}`).then(r => r.data);

export const addDirectSplit = (friendId, amount, description, paidByMe) =>
  api.post(`/api/users/me/direct/${friendId}`, { amount, description, paidByMe }).then(r => r.data);

export const getAllDirectSplits = () =>
  api.get('/api/users/me/direct').then(r => r.data);

export const requestSettle = (friendId, amount) =>
  api.post(`/api/users/me/direct/${friendId}/settle`, { amount }).then(r => r.data);

export const confirmSettle = (friendId, requestId) =>
  api.put(`/api/users/me/direct/${friendId}/settle/${requestId}/confirm`).then(r => r.data);
