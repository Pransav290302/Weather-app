import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { initializeDatabase, getDatabase } from "./database.js";
import { geocodeLocation, fetchWeatherData } from "./weather.js";
import { exportAsJson, exportAsCsv, exportAsMarkdown, exportAsPdf } from "./exports.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

const app = express();
app.use(express.json());

app.use(express.static(path.join(currentDirectory, "..", "client")));

await initializeDatabase();

const MAXIMUM_DAYS_ALLOWED = 31;

function parseDateString(dateString) {
  const parsedDate = new Date(dateString);
  return isNaN(parsedDate) ? null : parsedDate;
}

function formatDateToISO(date) {
  return date.toISOString().slice(0, 10);
}

function calculateDaysBetween(startDate, endDate) {
  return Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
}

app.post("/api/queries", async (request, response) => {
  try {
    const { location, start_date, end_date } = request.body || {};
    
    if (!location) {
      return response.status(400).json({ error: "location required" });
    }
    
    const startDate = parseDateString(start_date);
    const endDate = parseDateString(end_date);
    
    if (!startDate || !endDate) {
      return response.status(400).json({ error: "invalid dates" });
    }
    
    if (startDate > endDate) {
      return response.status(400).json({ error: "start_date must be <= end_date" });
    }
    
    if (calculateDaysBetween(startDate, endDate) > MAXIMUM_DAYS_ALLOWED) {
      return response.status(400).json({ 
        error: `date range too large (>${MAXIMUM_DAYS_ALLOWED} days)` 
      });
    }

    const geocodedLocation = await geocodeLocation(location);
    const weatherData = await fetchWeatherData(
      geocodedLocation.latitude,
      geocodedLocation.longitude,
      formatDateToISO(startDate),
      formatDateToISO(endDate)
    );
    
    const database = getDatabase();
    const insertResult = await database.run(
      `INSERT INTO queries (original_input, resolved_name, latitude, longitude, start_date, end_date, daily_json)
       VALUES (?,?,?,?,?,?,?)`,
      location,
      geocodedLocation.name,
      geocodedLocation.latitude,
      geocodedLocation.longitude,
      formatDateToISO(startDate),
      formatDateToISO(endDate),
      JSON.stringify(weatherData)
    );
    
    response.json({ id: insertResult.lastID });
  } catch (error) {
    response.status(400).json({ error: error.message || "create failed" });
  }
});

app.get("/api/queries", async (request, response) => {
  const database = getDatabase();
  const allRecords = await database.all(
    `SELECT id, original_input, resolved_name, latitude, longitude, start_date, end_date, created_at 
     FROM queries ORDER BY id DESC`
  );
  response.json(allRecords);
});

app.get("/api/queries/:id", async (request, response) => {
  const database = getDatabase();
  const record = await database.get(
    `SELECT * FROM queries WHERE id=?`,
    request.params.id
  );
  
  if (!record) {
    return response.status(404).json({ error: "not found" });
  }
  
  response.json({
    id: record.id,
    original_input: record.original_input,
    resolved_name: record.resolved_name,
    latitude: record.latitude,
    longitude: record.longitude,
    start_date: record.start_date,
    end_date: record.end_date,
    created_at: record.created_at,
    daily: JSON.parse(record.daily_json || "[]"),
  });
});

app.put("/api/queries/:id", async (request, response) => {
  try {
    const database = getDatabase();
    const existingRecord = await database.get(
      `SELECT * FROM queries WHERE id=?`,
      request.params.id
    );
    
    if (!existingRecord) {
      return response.status(404).json({ error: "not found" });
    }

    let locationToUpdate = request.body.location ?? existingRecord.original_input;
    let startDateToUpdate = request.body.start_date ?? existingRecord.start_date;
    let endDateToUpdate = request.body.end_date ?? existingRecord.end_date;

    const startDate = parseDateString(startDateToUpdate);
    const endDate = parseDateString(endDateToUpdate);
    
    if (!startDate || !endDate) {
      return response.status(400).json({ error: "invalid dates" });
    }
    
    if (startDate > endDate) {
      return response.status(400).json({ error: "start_date must be <= end_date" });
    }
    
    if (calculateDaysBetween(startDate, endDate) > MAXIMUM_DAYS_ALLOWED) {
      return response.status(400).json({ 
        error: `date range too large (>${MAXIMUM_DAYS_ALLOWED} days)` 
      });
    }

    const geocodedLocation = await geocodeLocation(locationToUpdate);
    const weatherData = await fetchWeatherData(
      geocodedLocation.latitude,
      geocodedLocation.longitude,
      formatDateToISO(startDate),
      formatDateToISO(endDate)
    );

    await database.run(
      `UPDATE queries SET original_input=?, resolved_name=?, latitude=?, longitude=?, start_date=?, end_date=?, daily_json=? 
       WHERE id=?`,
      locationToUpdate,
      geocodedLocation.name,
      geocodedLocation.latitude,
      geocodedLocation.longitude,
      formatDateToISO(startDate),
      formatDateToISO(endDate),
      JSON.stringify(weatherData),
      request.params.id
    );
    
    response.json({ ok: true });
  } catch (error) {
    response.status(400).json({ error: error.message || "update failed" });
  }
});

app.delete("/api/queries/:id", async (request, response) => {
  const database = getDatabase();
  await database.run(`DELETE FROM queries WHERE id=?`, request.params.id);
  response.json({ ok: true });
});

app.get("/api/exports/:fmt", async (request, response) => {
  const recordId = request.query.id;
  const database = getDatabase();
  
  const records = recordId
    ? await database.all(`SELECT * FROM queries WHERE id=?`, recordId)
    : await database.all(`SELECT * FROM queries ORDER BY id DESC`);

  const exportFormat = request.params.fmt;

  if (exportFormat === "json") {
    exportAsJson(response, records);
  } else if (exportFormat === "csv") {
    exportAsCsv(response, records);
  } else if (exportFormat === "md") {
    exportAsMarkdown(response, records);
  } else if (exportFormat === "pdf") {
    exportAsPdf(response, records);
  } else {
    response.status(400).json({ error: "unsupported format" });
  }
});

app.get("/api/wiki", async (request, response) => {
  try {
    const placeName = request.query.name;
    
    if (!placeName) {
      return response.json({ html: "" });
    }
    
    const wikiResponse = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(placeName)}`
    );
    
    if (!wikiResponse.ok) {
      return response.json({ html: "" });
    }
    
    const wikiData = await wikiResponse.json();
    let imageHtml = "";
    
    if (wikiData.thumbnail?.source) {
      imageHtml = `<img src="${wikiData.thumbnail.source}" alt="${wikiData.title}" style="max-width:100%;border-radius:12px;margin:.4rem 0">`;
    }
    
    const summaryHtml = `<div><strong>${wikiData.title || placeName}</strong></div>${imageHtml}<div style="color:#9fb0d0">${wikiData.extract || ""}</div>`;
    
    response.json({ html: summaryHtml });
  } catch {
    response.json({ html: "" });
  }
});

app.get("/api/quick", async (request, response) => {
  try {
    const userInput = request.query.input || "";
    
    if (!userInput) {
      return response.status(400).json({ error: "input required" });
    }
    
    const geocodedLocation = await geocodeLocation(userInput);
    const weatherApiUrl = new URL("https://api.open-meteo.com/v1/forecast");
    
    weatherApiUrl.searchParams.set("latitude", geocodedLocation.latitude);
    weatherApiUrl.searchParams.set("longitude", geocodedLocation.longitude);
    weatherApiUrl.searchParams.set("daily", "temperature_2m_min,temperature_2m_max");
    weatherApiUrl.searchParams.set("timezone", "auto");
    
    const weatherResponse = await fetch(weatherApiUrl.toString());
    const weatherData = await weatherResponse.json();
    
    response.json({
      name: geocodedLocation.name,
      latitude: geocodedLocation.latitude,
      longitude: geocodedLocation.longitude,
      daily: weatherData.daily
    });
  } catch (error) {
    response.status(400).json({ error: error.message || "failed" });
  }
});

app.get("/api/health", (request, response) => {
  response.json({ ok: true });
});

const SERVER_PORT = process.env.PORT || 3000;
app.listen(SERVER_PORT, () => {
  console.log(`Weather app running on http://localhost:${SERVER_PORT}`);
});