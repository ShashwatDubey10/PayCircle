import api from '@/services/api';

export const getContacts = () =>
  api.get('/api/users/me/contacts').then(r => r.data.contacts || []);

export const createContact = (name) =>
  api.post('/api/users/me/contacts', { name }).then(r => r.data.contact);

export const updateContact = (id, name) =>
  api.patch(`/api/users/me/contacts/${id}`, { name }).then(r => r.data.contact);

export const deleteContact = (id) =>
  api.delete(`/api/users/me/contacts/${id}`).then(r => r.data);
