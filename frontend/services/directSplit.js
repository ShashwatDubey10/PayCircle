import api from '@/services/api';

export const getDirectSplits = (friendId) =>
  api.get(`/api/users/me/direct/${friendId}`).then(r => r.data);

export const addDirectSplit = (friendId, amount, description, paidByMe) =>
  api.post(`/api/users/me/direct/${friendId}`, { amount, description, paidByMe }).then(r => r.data);
