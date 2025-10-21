import fetch from "node-fetch";

export async function geocodeLocation(userInput) {
  const coordinatePattern = /^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/;
  const matchedCoordinates = coordinatePattern.exec(userInput);

  if (matchedCoordinates) {
    const latitude = parseFloat(matchedCoordinates[1]);
    const longitude = parseFloat(matchedCoordinates[3]);
    return {
      name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      latitude: latitude,
      longitude: longitude
    };
  }

  const geocodingApiUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(userInput)}&count=1&language=en&format=json`;
  const geocodingResponse = await fetch(geocodingApiUrl);

  if (!geocodingResponse.ok) {
    throw new Error("Geocoding failed");
  }

  const geocodingData = await geocodingResponse.json();

  if (!geocodingData.results || geocodingData.results.length === 0) {
    throw new Error("No matching location found");
  }

  const firstResult = geocodingData.results[0];
  const resolvedLocationName = [
    firstResult.name,
    firstResult.admin1,
    firstResult.country_code
  ].filter(Boolean).join(", ");

  return {
    name: resolvedLocationName,
    latitude: firstResult.latitude,
    longitude: firstResult.longitude
  };
}

export async function fetchWeatherData(latitude, longitude, startDateISO, endDateISO) {
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  const startDate = new Date(startDateISO);
  const endDate = new Date(endDateISO);

  const weatherApiBase = endDate < currentDate
    ? "https://archive-api.open-meteo.com/v1/era5"
    : "https://api.open-meteo.com/v1/forecast";

  const weatherApiUrl = new URL(weatherApiBase);
  weatherApiUrl.searchParams.set("latitude", latitude);
  weatherApiUrl.searchParams.set("longitude", longitude);
  weatherApiUrl.searchParams.set("start_date", startDateISO);
  weatherApiUrl.searchParams.set("end_date", endDateISO);
  weatherApiUrl.searchParams.set("daily", "temperature_2m_min,temperature_2m_max");
  weatherApiUrl.searchParams.set("timezone", "auto");

  const weatherResponse = await fetch(weatherApiUrl.toString());

  if (!weatherResponse.ok) {
    throw new Error("Weather API failed");
  }

  const weatherData = await weatherResponse.json();
  const dailyTemperatures = [];

  const dates = weatherData.daily?.time || [];
  const minimumTemperatures = weatherData.daily?.temperature_2m_min || [];
  const maximumTemperatures = weatherData.daily?.temperature_2m_max || [];

  for (let dayIndex = 0; dayIndex < dates.length; dayIndex++) {
    dailyTemperatures.push({
      date: dates[dayIndex],
      tmin: minimumTemperatures[dayIndex],
      tmax: maximumTemperatures[dayIndex]
    });
  }

  return dailyTemperatures;
}