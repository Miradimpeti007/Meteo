'use strict';
require('dotenv').config();
const app = require('./app');
const { start } = require('./services/worker');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  start();
});
