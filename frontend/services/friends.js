import api from '@/services/api';

export const searchUsers       = (username)       => api.get('/api/users/search', { params: { username } }).then(r => r.data.users);
export const sendFriendRequest = (userId)         => api.post('/api/users/me/friends/requests', { recipientId: userId }).then(r => r.data);
export const getPendingRequests = ()              => api.get('/api/users/me/friends/requests').then(r => r.data.requests);
export const respondToRequest  = (id, action)    => api.put(`/api/users/me/friends/requests/${id}`, { action }).then(r => r.data);
export const getFriends        = ()              => api.get('/api/users/me/friends').then(r => r.data.friends);
export const updatePushToken   = (token)         => api.put('/api/users/me/push-token', { token }).then(r => r.data);
export const setUsername       = (username)      => api.put('/api/users/me/username', { username }).then(r => r.data);
