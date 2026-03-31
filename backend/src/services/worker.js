'use strict';
require('dotenv').config();
const cron = require('node-cron');
const axios = require('axios');
const { getShard } = require('../models');

const fetchAndStore = async () => {
  try {
    console.log('Worker: fetching data from data service...');
    const now = new Date().toISOString();
    const response = await axios.get(
      `${process.env.DATA_SERVICE_URL}/data?at=${now}&field=t`
    );
    const stations = response.data.places;
    console.log(`Worker: received ${stations.length} stations`);
    for (const station of stations) {
      try {
        const db = getShard(station.lat, station.lon);
        await db.previsions.upsert({
          name: station.name,
          indice: station.value,
          longitude: station.lon,
          latitude: station.lat,
          dateprevision: new Date(station.ts)
        });
        console.log(`Worker: saved ${station.name}`);
      } catch (err) {
        console.error(`Worker: failed to save ${station.name}:`, err.message);
      }
    }
    console.log('Worker: done');
  } catch (err) {
    console.error('Worker: fetch failed:', err.message);
  }
};

const start = () => {
  const interval = process.env.WORKER_INTERVAL || '*/5 * * * *';
  console.log(`Worker: starting with interval ${interval}`);
  cron.schedule(interval, fetchAndStore);
  fetchAndStore();
};

module.exports = { start, fetchAndStore };
