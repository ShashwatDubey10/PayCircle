import api from '@/services/api';

export const getDirectSplits = (friendId) =>
  api.get(`/api/users/me/direct/${friendId}`).then(r => r.data);

export const addDirectSplit = (friendId, amount, description, paidByMe, myShare) =>
  api.post(`/api/users/me/direct/${friendId}`, {
    amount, description, paidByMe,
    ...(myShare !== null && myShare !== undefined ? { myShare } : {}),
  }).then(r => r.data);

export const getAllDirectSplits = () =>
  api.get('/api/users/me/direct').then(r => r.data);

export const requestSettle = (friendId, amount, fromContact = false) =>
  api.post(`/api/users/me/direct/${friendId}/settle`, { amount, ...(fromContact ? { fromContact: true } : {}) }).then(r => r.data);

export const confirmSettle = (friendId, requestId) =>
  api.put(`/api/users/me/direct/${friendId}/settle/${requestId}/confirm`).then(r => r.data);

export const getAllDirectSettlements = () =>
  api.get('/api/users/me/direct/settlements').then(r => r.data);

export const getAllDirectBalances = () =>
  api.get('/api/users/me/direct/balances').then(r => r.data);

export const cancelOrRejectSettle = (friendId, requestId) =>
  api.delete(`/api/users/me/direct/${friendId}/settle/${requestId}`).then(r => r.data);

export const getGroupDebtsWithFriend = (friendId) =>
  api.get(`/api/users/me/direct/${friendId}/group-balances`).then(r => r.data);

export const updateDirectSplit = (friendId, splitId, fields) =>
  api.patch(`/api/users/me/direct/${friendId}/splits/${splitId}`, fields).then(r => r.data);
