import api from '@/services/api';

export const upsertSplitTag = (refId, refType, category) =>
  api.post('/api/users/me/split-tags', { refId, refType, category }).then(r => r.data);

export const getSplitTags = () =>
  api.get('/api/users/me/split-tags').then(r => r.data);
