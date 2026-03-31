const axios = require('axios');
const { previsions } = require('../models');

/**
 * Validation contract for forecast data.
 * Each function returns the formatted value if valid, or null if invalid.
 */
const previsionsValidationMapping = {
  name: (val) => (typeof val === 'string' && val.trim() !== '' ? val.trim() : null),
  indice: (val) => (isNaN(parseFloat(val)) ? null : parseFloat(val)),
  latitude: (val) => (isNaN(parseFloat(val)) ? null : parseFloat(val)),
  longitude: (val) => (isNaN(parseFloat(val)) ? null : parseFloat(val)),
  dateprevisions: (val) => (isNaN(Date.parse(val)) ? null : val)
};

/**
 * Validates and saves a collection of forecast data.
 * Any item with at least one null value after validation is discarded.
 * @param {Array} jsonData - Raw data array from external API.
 */
async function processAndSave(jsonData) {
  if (!Array.isArray(jsonData)) {
    throw new Error('Invalid data format: expected an array.');
  }

  const validatedData = jsonData
    .map(item => {
      const validatedItem = {};
      let isValid = true;

      // Apply the contract to each field
      for (const key in previsionsValidationMapping) {
        const rawValue = item[key];
        const validatedValue = previsionsValidationMapping[key](rawValue);

        if (validatedValue === null) {
          isValid = false;
          break;
        }
        validatedItem[key] = validatedValue;
      }

      return isValid ? validatedItem : null;
    })
    .filter(item => item !== null); // Remove invalid records

  if (validatedData.length === 0) {
    console.warn('[WARNING] No valid data found to save.');
    return 0;
  }

  // Database insertion with duplicate handling based on the composite unique key
  const results = await previsions.bulkCreate(validatedData, {
    ignoreDuplicates: true
  });

  return results.length;
}

/**
 * Fetches the most recent weather forecasts.
 */
async function syncRecent() {
  const response = await axios.get(process.env.API_URL_RECENT);
  return await processAndSave(response.data);
}

/**
 * Fetches historical data for a specific number of days.
 */
async function syncHistory(days) {
  const url = `${process.env.API_URL_HISTORY}?days=${days}`;
  const response = await axios.get(url);
  return await processAndSave(response.data);
}

/**
 * Fetches data for a specific date range.
 */
async function syncRange(start, end) {
  const url = `${process.env.API_URL_RANGE}?start=${start}&end=${end}`;
  const response = await axios.get(url);
  return await processAndSave(response.data);
}

module.exports = {
  syncRecent,
  syncHistory,
  syncRange
};