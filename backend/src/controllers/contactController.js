const crypto       = require('crypto');
const User         = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const logger       = require('../utils/logger');

// POST /api/users/me/contacts
const createContact = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name?.trim())
    return res.status(400).json({ success: false, message: 'Name is required' });

  // Generate a unique placeholder email and an unusable random password
  const uid      = crypto.randomBytes(8).toString('hex');
  const email    = `vc.${uid}@virtual.paycircle`;
  const password = crypto.randomBytes(16).toString('hex');

  const contact = await User.create({
    name:      name.trim(),
    email,
    password,
    isVirtual: true,
    createdBy: req.user._id,
  });

  logger.info('CONTACT', `Created personal contact: ${contact.name}`, {
    createdBy: req.user._id,
    contactId: contact._id,
  });

  res.status(201).json({
    success: true,
    contact: { _id: contact._id, name: contact.name, createdAt: contact.createdAt },
  });
});

// GET /api/users/me/contacts
const getContacts = asyncHandler(async (req, res) => {
  const contacts = await User.find({ isVirtual: true, createdBy: req.user._id, deletedAt: null })
    .select('name createdAt')
    .sort({ name: 1 });

  res.json({ success: true, contacts });
});

// PATCH /api/users/me/contacts/:id
const updateContact = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name?.trim())
    return res.status(400).json({ success: false, message: 'Name is required' });

  const contact = await User.findOne({
    _id:       req.params.id,
    isVirtual: true,
    createdBy: req.user._id,
    deletedAt: null,
  });
  if (!contact)
    return res.status(404).json({ success: false, message: 'Contact not found' });

  contact.name = name.trim();
  await contact.save();

  logger.info('CONTACT', `Updated contact: ${contact.name}`, { contactId: contact._id });
  res.json({ success: true, contact: { _id: contact._id, name: contact.name } });
});

// DELETE /api/users/me/contacts/:id
const deleteContact = asyncHandler(async (req, res) => {
  const contact = await User.findOne({
    _id:       req.params.id,
    isVirtual: true,
    createdBy: req.user._id,
    deletedAt: null,
  });
  if (!contact)
    return res.status(404).json({ success: false, message: 'Contact not found' });

  // Soft delete: the document must survive so that groups, expenses and splits
  // that reference it keep resolving (the UI promises "split history is kept").
  contact.deletedAt = new Date();
  await contact.save();

  logger.info('CONTACT', `Archived contact: ${contact.name}`, { contactId: contact._id });
  res.json({ success: true });
});

module.exports = { createContact, getContacts, updateContact, deleteContact };
