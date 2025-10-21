import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

let databaseConnection;

export async function initializeDatabase() {
  databaseConnection = await open({
    filename: path.join(currentDirectory, "weather.db"),
    driver: sqlite3.Database
  });

  await databaseConnection.exec(`
    CREATE TABLE IF NOT EXISTS queries(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_input TEXT NOT NULL,
      resolved_name TEXT,
      latitude REAL,
      longitude REAL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      daily_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

export function getDatabase() {
  return databaseConnection;
}