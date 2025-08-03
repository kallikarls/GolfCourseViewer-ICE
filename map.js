let map = L.map("map").setView([64.9631, -19.0208], 6); // Center on Iceland

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
}).addTo(map);

let currentLayer = null;
let selectedCourseName = null;
let sortCourseAsc = true;
let sortClubAsc = true;
let courseData = [];

const searchInput = document.getElementById("searchInput");
const toggleBtn = document.getElementById("toggleBtn");
const coursePanel = document.getElementById("coursePanel");

function toggleCoursePanel() {
  coursePanel.classList.toggle("expanded");
  coursePanel.classList.toggle("collapsed");

  const icon = toggleBtn.querySelector("i");
  icon.classList.toggle("bi-chevron-up");
  icon.classList.toggle("bi-chevron-down");
}

function loadCourseIndex() {
  fetch("courseIndex.json")
    .then((response) => response.json())
    .then((data) => {
      courseData = Object.entries(data).map(([course, club]) => ({ course, club }));
      courseData.sort((a, b) => a.course.localeCompare(b.course, "is"));
      populateCourseTable(courseData);
    });
}

function populateCourseTable(data) {
  const tbody = document.getElementById("courseTableBody");
  tbody.innerHTML = "";

  data.forEach(({ course, club }) => {
    const row = document.createElement("tr");

    const courseCell = document.createElement("td");
    courseCell.textContent = course;

    const clubCell = document.createElement("td");
    clubCell.textContent = club;

    row.appendChild(courseCell);
    row.appendChild(clubCell);

    row.addEventListener("click", () => {
      searchInput.value = `${course} (${club})`;
      selectedCourseName = course;
      loadCourseGeoJson(course);
    });

    tbody.appendChild(row);
  });
}

function filterCourseTable(query) {
  const filtered = courseData.filter(
    ({ course, club }) =>
      course.toLowerCase().includes(query.toLowerCase()) ||
      club.toLowerCase().includes(query.toLowerCase())
  );

  populateCourseTable(filtered);

  // Automatically expand panel if collapsed and a match is found
  if (filtered.length > 0 && coursePanel.classList.contains("collapsed")) {
    toggleCoursePanel();
  }
}

function loadCourseGeoJson(courseName) {
  fetch(`courses/${encodeURIComponent(courseName)}.geojson`)
    .then((response) => {
      if (!response.ok) throw new Error("Failed to load course geojson");
      return response.json();
    })
    .then((data) => {
      if (currentLayer) {
        map.removeLayer(currentLayer);
      }

      currentLayer = L.geoJSON(data, {
        onEachFeature: (feature, layer) => {
          if (feature.properties) {
            const props = feature.properties;
            const info = `
            <strong>Layer:</strong> ${props.layer || "N/A"}<br>
            <strong>Course:</strong> ${props.courseName || "N/A"}<br>
            <strong>Club:</strong> ${props.clubName || "N/A"}<br>
            <strong>Latitude:</strong> ${props.Latitude || "N/A"}<br>
            <strong>Longitude:</strong> ${props.Longitude || "N/A"}<br>
            <strong>AreaSqMeters:</strong> ${props.AreaSqMeters || "N/A"}<br>
            <strong>Altitude (m):</strong> ${props.AltitudeM || "N/A"}<br>
            <strong>Altitude (ft):</strong> ${props.AltitudeFt || "N/A"}
            `;
    layer.bindPopup(info);
          }
        },
      }).addTo(map);

      map.fitBounds(currentLayer.getBounds());

      updateLayerToggles(currentLayer);
      updateLayerAreas(currentLayer);
    })
    .catch((error) => {
      console.error("Error loading GeoJSON:", error);
    });
}

function updateLayerToggles(layerGroup) {
  const toggles = document.getElementById("layerToggles");
  toggles.innerHTML = "";

  const grouped = {};

  layerGroup.eachLayer((layer) => {
    const layerName = layer.feature?.properties?.layer;
    if (!layerName) return;

    if (!grouped[layerName]) {
      grouped[layerName] = [];
    }
    grouped[layerName].push(layer);
  });

  for (const [name, layers] of Object.entries(grouped)) {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;
    checkbox.id = `layer-toggle-${name}`;

    checkbox.addEventListener("change", () => {
      layers.forEach((layer) => {
        if (checkbox.checked) {
          layer.addTo(map);
        } else {
          map.removeLayer(layer);
        }
      });
    });

    const label = document.createElement("label");
    label.htmlFor = checkbox.id;
    label.textContent = name;
    label.style.marginLeft = "0.5rem";

    const div = document.createElement("div");
    div.appendChild(checkbox);
    div.appendChild(label);

    toggles.appendChild(div);
  }
}

function updateLayerAreas(layerGroup) {
  const areasDiv = document.getElementById("layerAreas");
  areasDiv.innerHTML = "";

  const areas = {};

  layerGroup.eachLayer((layer) => {
    const props = layer.feature?.properties;
    if (!props?.layer || props.AreaSqMeters == null) return;

    if (!areas[props.layer]) {
      areas[props.layer] = 0;
    }
    areas[props.layer] += props.AreaSqMeters;
  });

  for (const [layerName, totalArea] of Object.entries(areas)) {
    const p = document.createElement("p");
    p.textContent = `${layerName}: ${totalArea.toFixed(2)} m²`;
    areasDiv.appendChild(p);
  }
}

// Event bindings
searchInput.addEventListener("input", (e) => {
  filterCourseTable(e.target.value);
});

searchInput.addEventListener("focus", (e) => {
  e.target.select();
});

// Sorting handlers
document.getElementById("sortCourse").addEventListener("click", () => {
  sortCourseAsc = !sortCourseAsc;
  courseData.sort((a, b) =>
    sortCourseAsc
      ? a.course.localeCompare(b.course, "is")
      : b.course.localeCompare(a.course, "is")
  );
  filterCourseTable(searchInput.value);
});

document.getElementById("sortClub").addEventListener("click", () => {
  sortClubAsc = !sortClubAsc;
  courseData.sort((a, b) =>
    sortClubAsc
      ? a.club.localeCompare(b.club, "is")
      : b.club.localeCompare(a.club, "is")
  );
  filterCourseTable(searchInput.value);
});

// Initialize
loadCourseIndex();
