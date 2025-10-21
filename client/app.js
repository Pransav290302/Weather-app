const selectElement = (selector) => document.querySelector(selector);

const elements = {
  createForm: selectElement("#create-form"),
  locationInput: selectElement("#loc"),
  startDateInput: selectElement("#start"),
  endDateInput: selectElement("#end"),
  useMyLocationButton: selectElement("#use-my-location"),
  createErrorMessage: selectElement("#create-error"),
  tableBody: selectElement("#table tbody"),
  refreshButton: selectElement("#refresh"),
  detailPanel: selectElement("#detail"),
  wikiPanel: selectElement("#wiki"),
  mapContainer: selectElement("#map"),
  errorPanel: selectElement("#error"),
  quickSearchInput: selectElement("#q"),
  quickSearchButton: selectElement("#qbtn"),
  quickResultsPanel: selectElement("#quick-res"),
  themeToggle: selectElement("#theme-toggle"),
  themeIcon: selectElement("#theme-icon"),
  themeText: selectElement("#theme-text"),
  infoButton: selectElement("#info-button"),
  infoModal: selectElement("#info-modal"),
  modalClose: selectElement("#modal-close"),
};

let mapInstance, mapMarker;

function initializeTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeButton(savedTheme);
}

function updateThemeButton(theme) {
  if (theme === 'dark') {
    elements.themeIcon.textContent = '🌙';
    elements.themeText.textContent = 'Dark Mode';
  } else {
    elements.themeIcon.textContent = '☀️';
    elements.themeText.textContent = 'Light Mode';
  }
}

elements.themeToggle.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeButton(newTheme);
});

elements.infoButton.addEventListener('click', () => {
  elements.infoModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
});

elements.modalClose.addEventListener('click', () => {
  elements.infoModal.classList.add('hidden');
  document.body.style.overflow = 'auto';
});

elements.infoModal.addEventListener('click', (event) => {
  if (event.target === elements.infoModal) {
    elements.infoModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
  }
});

function displayError(element, message) {
  element.textContent = message;
  element.classList.remove("hidden");
}

function clearError(element) {
  element.classList.add("hidden");
}

elements.createForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError(elements.createErrorMessage);
  
  try {
    const requestBody = {
      location: elements.locationInput.value.trim(),
      start_date: elements.startDateInput.value,
      end_date: elements.endDateInput.value
    };
    
    const response = await fetch("/api/queries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      throw new Error(responseData.error || "Failed to create");
    }
    
    await loadAllRecords();
    showRecordDetails(responseData.id);
  } catch (error) {
    displayError(elements.createErrorMessage, error.message);
  }
});

elements.useMyLocationButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    return displayError(elements.createErrorMessage, "Geolocation not supported.");
  }
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      elements.locationInput.value = `${position.coords.latitude.toFixed(5)},${position.coords.longitude.toFixed(5)}`;
    },
    () => displayError(elements.createErrorMessage, "Location permission denied.")
  );
});

async function loadAllRecords() {
  const response = await fetch("/api/queries");
  const records = await response.json();
  
  elements.tableBody.innerHTML = "";
  
  records.forEach(record => {
    const tableRow = document.createElement("tr");
    tableRow.innerHTML = `
      <td>${record.id}</td>
      <td>${sanitizeHtml(record.original_input)}</td>
      <td>${sanitizeHtml(record.resolved_name || "")}</td>
      <td><span class="badge">${record.start_date}</span><span class="badge">${record.end_date}</span></td>
      <td>${record.latitude?.toFixed(3)}, ${record.longitude?.toFixed(3)}</td>
      <td class="actions">
        <button data-id="${record.id}" class="btn secondary view">View</button>
        <button data-id="${record.id}" class="btn secondary edit">Update</button>
        <button data-id="${record.id}" class="btn secondary del">Delete</button>
        <a class="btn" href="/api/exports/json?id=${record.id}" target="_blank">JSON</a>
        <a class="btn" href="/api/exports/csv?id=${record.id}" target="_blank">CSV</a>
        <a class="btn" href="/api/exports/md?id=${record.id}" target="_blank">MD</a>
        <a class="btn" href="/api/exports/pdf?id=${record.id}" target="_blank">PDF</a>
      </td>`;
    elements.tableBody.appendChild(tableRow);
  });
}

function showRecordDetails(recordId) {
  const viewButton = elements.tableBody.querySelector(`.view[data-id="${recordId}"]`);
  if (viewButton) {
    viewButton.click();
  }
}

elements.tableBody.addEventListener("click", async (event) => {
  const clickedElement = event.target;
  const recordId = clickedElement.getAttribute("data-id");
  
  if (!recordId) return;
  
  if (clickedElement.classList.contains("view")) {
    const response = await fetch(`/api/queries/${recordId}`);
    const recordData = await response.json();
    renderRecordDetails(recordData);
    renderMapLocation(recordData.latitude, recordData.longitude);
    loadWikipediaInfo(recordData.resolved_name || recordData.original_input);
  } else if (clickedElement.classList.contains("edit")) {
    const newStartDate = prompt("New start date (YYYY-MM-DD)", "");
    const newEndDate = prompt("New end date (YYYY-MM-DD)", "");
    const newLocation = prompt("New location (optional, blank to keep same)", "");
    
    const updateBody = {};
    if (newStartDate) updateBody.start_date = newStartDate;
    if (newEndDate) updateBody.end_date = newEndDate;
    if (newLocation) updateBody.location = newLocation;
    
    const response = await fetch(`/api/queries/${recordId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateBody)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      alert(result.error || "Update failed");
      return;
    }
    
    await loadAllRecords();
    showRecordDetails(recordId);
  } else if (clickedElement.classList.contains("del")) {
    if (!confirm("Delete this record?")) return;
    
    const response = await fetch(`/api/queries/${recordId}`, {
      method: "DELETE"
    });
    
    if (response.ok) {
      await loadAllRecords();
      elements.detailPanel.textContent = "Select a record…";
    }
  }
});

function renderRecordDetails(record) {
  const temperatureList = (record.daily || [])
    .map(day => `${day.date}: min ${Math.round(day.tmin)}° / max ${Math.round(day.tmax)}°`)
    .join("<br>");
  
  elements.detailPanel.innerHTML = `
    <div><strong>${sanitizeHtml(record.resolved_name || record.original_input)}</strong></div>
    <div>Dates: ${record.start_date} → ${record.end_date}</div>
    <div>Coords: ${record.latitude?.toFixed(4)}, ${record.longitude?.toFixed(4)}</div>
    <div style="margin:.4rem 0">${temperatureList || "No daily data"}</div>
  `;
}

function renderMapLocation(latitude, longitude) {
  if (latitude == null || longitude == null) return;
  
  if (!mapInstance) {
    mapInstance = L.map('map').setView([latitude, longitude], 9);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(mapInstance);
  } else {
    mapInstance.setView([latitude, longitude], 9);
  }
  
  if (mapMarker) {
    mapInstance.removeLayer(mapMarker);
  }
  
  mapMarker = L.marker([latitude, longitude]).addTo(mapInstance);
}

async function loadWikipediaInfo(placeName) {
  if (!placeName) return;
  
  elements.wikiPanel.innerHTML = "Loading wiki…";
  
  try {
    const response = await fetch(`/api/wiki?name=${encodeURIComponent(placeName)}`);
    const wikiData = await response.json();
    elements.wikiPanel.innerHTML = wikiData.html || "No summary.";
  } catch {
    elements.wikiPanel.textContent = "No wiki info.";
  }
}

elements.quickSearchButton.addEventListener("click", async () => {
  elements.quickResultsPanel.textContent = "Loading…";
  
  try {
    const searchQuery = elements.quickSearchInput.value.trim();
    const response = await fetch(`/api/quick?input=${encodeURIComponent(searchQuery)}`);
    const weatherData = await response.json();
    
    if (weatherData.error) {
      throw new Error(weatherData.error);
    }
    
    const forecastDays = weatherData.daily?.time?.slice(0, 5) || [];
    const forecastHtml = forecastDays
      .map((date, index) => 
        `<div class="badge">${date}: ${Math.round(weatherData.daily.temperature_2m_min[index])}° / ${Math.round(weatherData.daily.temperature_2m_max[index])}°</div>`
      )
      .join(" ");
    
    elements.quickResultsPanel.innerHTML = `
      <div><strong>${weatherData.name}</strong> — Lat ${weatherData.latitude.toFixed(3)}, Lon ${weatherData.longitude.toFixed(3)}</div>
      <div>${forecastHtml}</div>
    `;
  } catch (error) {
    elements.quickResultsPanel.textContent = error.message;
  }
});

function sanitizeHtml(text) {
  return (text || "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[character]));
}

initializeTheme();
loadAllRecords();