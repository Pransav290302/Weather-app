# Weather App 

A full-stack weather application with CRUD operations, data persistence, validation, and multiple export formats.

## Features

- **CRUD Operations**: Create, Read, Update, and Delete weather queries
- **Data Persistence**: SQLite database storage
- **Geocoding**: Supports city names, ZIP codes, or lat/lon coordinates
- **Weather Data**: Historical archive and forecast data from Open-Meteo
- **Interactive Map**: Leaflet.js integration with OpenStreetMap
- **Wikipedia Integration**: Location information and images
- **Quick Weather**: Real-time 5-day forecast lookup
- **Multiple Exports**: JSON, CSV, Markdown, and PDF formats
- **Date Validation**: 31-day maximum range with proper validation
- **Responsive Design**: Modern dark theme UI

## Project Structure

```
weather-app-advanced/
├── client/
│   ├── index.html          # Main HTML structure
│   ├── app.js              # Client-side JavaScript logic
│   └── theme.css           # Dark theme styling
├── server/
│   ├── index.js            # Express server and API routes
│   ├── database.js         # SQLite database initialization
│   ├── weather.js          # Weather and geocoding APIs
│   └── exports.js          # Export functionality (JSON/CSV/MD/PDF)
├── package.json            # Dependencies and scripts
└── README.md               # Documentation
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd weather-app-advanced
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Development mode** (with auto-reload)
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

## API Endpoints

### Weather Queries

- `POST /api/queries` - Create new weather query
- `GET /api/queries` - Get all queries
- `GET /api/queries/:id` - Get single query by ID
- `PUT /api/queries/:id` - Update existing query
- `DELETE /api/queries/:id` - Delete query

### Exports

- `GET /api/exports/json?id=` - Export as JSON
- `GET /api/exports/csv?id=` - Export as CSV
- `GET /api/exports/md?id=` - Export as Markdown
- `GET /api/exports/pdf?id=` - Export as PDF

### Additional

- `GET /api/wiki?name=` - Get Wikipedia summary
- `GET /api/quick?input=` - Get quick 5-day forecast
- `GET /api/health` - Health check

## Technologies Used

### Frontend
- Vanilla JavaScript
- Leaflet.js for maps
- OpenStreetMap tiles
- Responsive CSS with dark theme

### Backend
- Node.js
- Express.js
- SQLite3 with sqlite wrapper
- PDFKit for PDF generation
- csv-stringify for CSV exports

### APIs
- Open-Meteo (Weather & Geocoding) - No API key required
- Wikipedia REST API
- OpenStreetMap tiles

## Database Schema

```sql
CREATE TABLE queries(
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
```

## Usage Examples

### Create Weather Query
1. Enter location 
2. Select start and end dates (max 31 days apart)
3. Click "Create + Fetch"

### Use Current Location
- Click "Use My Location" to auto-fill coordinates
- Browser will request location permission

### View Record Details
- Click "View" button on any record
- See temperature data, map location, and Wikipedia info

### Update Record
- Click "Update" button
- Enter new dates or location when prompted

### Export Data
- Individual record: Click export buttons in Actions column
- All records: Use export buttons in toolbar

### Quick Weather Lookup
- Enter location in Quick Weather section
- Get instant 5-day forecast without saving to database

## Environment Variables

- `PORT` - Server port (default: 3000)

## License

Private project

