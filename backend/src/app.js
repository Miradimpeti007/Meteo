'use strict';
const express = require('express');
const app = express();

app.use(express.json());

const dataRoutes = require('./routes/data');
app.use('/api', dataRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = app;
