const axios = require('axios');

async function geocode(query) {
  if (!query || !query.trim()) return null;

  try {
    const token = process.env.MAPBOX_TOKEN;

    if (!token) {
      console.warn('⚠️ MAPBOX_TOKEN missing in .env — geocoding skipped');
      return null;
    }

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      query
    )}.json`;

    const { data } = await axios.get(url, {
      params: {
        access_token: token,
        limit: 1,
      },
    });

    if (!data.features || data.features.length === 0) return null;

    const [lng, lat] = data.features[0].center;
    return { lng, lat, placeName: data.features[0].place_name };
  } catch (err) {
    console.error('Geocode error:', err.message);
    return null;
  }
}

module.exports = { geocode };