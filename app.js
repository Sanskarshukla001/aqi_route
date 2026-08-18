import { PathRiskEngine, geocodeLocation, ACTIVITIES } from './path_risk_algorithm.js';

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const startInput = document.getElementById('start-input');
  const destInput = document.getElementById('dest-input');
  const btnAnalyze = document.getElementById('btn-analyze');
  const activityBtns = document.querySelectorAll('.activity-btn');
  const profileChips = document.querySelectorAll('.chip-toggle');
  const presetChips = document.querySelectorAll('.preset-chip');
  
  const loadingOverlay = document.getElementById('loading-overlay');
  const resultsContent = document.getElementById('results-content');
  
  const verdictBanner = document.getElementById('verdict-banner');
  const verdictTitle = document.getElementById('verdict-title');
  const riskBadge = document.getElementById('risk-badge');
  
  const valAvgAqi = document.getElementById('val-avg-aqi');
  const valDuration = document.getElementById('val-duration');
  const valDistance = document.getElementById('val-distance');
  const valInhaled = document.getElementById('val-inhaled');
  
  const timelineContainer = document.getElementById('segment-timeline');
  const routeCanvas = document.getElementById('route-canvas');
  const recsContainer = document.getElementById('recs-list');
  const altBox = document.getElementById('alt-route-box');

  // State
  let selectedActivity = 'WALK';
  const profileState = {
    hasAsthma: false,
    hasRespiratoryCondition: false,
    isElderly: false,
    hasChildren: false,
    isOutdoorWorker: false
  };

  const engine = new PathRiskEngine();

  // Activity Switcher
  activityBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      activityBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedActivity = btn.dataset.activity;
    });
  });

  // Profile Chip Toggles
  profileChips.forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
      const key = chip.dataset.profile;
      profileState[key] = chip.classList.contains('active');
    });
  });

  // Quick Preset Location Buttons
  presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const start = chip.dataset.start;
      const dest = chip.dataset.dest;
      startInput.value = start;
      destInput.value = dest;
      triggerAnalysis();
    });
  });

  // Analyze Button Handler
  btnAnalyze.addEventListener('click', () => {
    triggerAnalysis();
  });

  async function triggerAnalysis() {
    const startQuery = startInput.value.trim() || 'London';
    const destQuery = destInput.value.trim() || 'Oxford';

    showLoading(true);

    try {
      // 1. Initial Geocode
      let originLoc = await geocodeLocation(startQuery);
      let destLoc = await geocodeLocation(destQuery);

      // Check distance & apply smart proximity bias if distance > 150 km for local queries
      const haversineDist = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      };

      let dist = haversineDist(originLoc.lat, originLoc.lon, destLoc.lat, destLoc.lon);

      if (dist > 150) {
        // Try re-geocoding origin using destination's location bias & city context
        const destCity = destLoc.city || destLoc.displayName.split(",")[0];
        const originCity = originLoc.city || originLoc.displayName.split(",")[0];

        try {
          const reOrigin = await geocodeLocation(startQuery, { lat: destLoc.lat, lon: destLoc.lon }, destCity);
          const reDist = haversineDist(reOrigin.lat, reOrigin.lon, destLoc.lat, destLoc.lon);
          if (reDist < dist) {
            originLoc = reOrigin;
            dist = reDist;
          }
        } catch (_e) {}

        try {
          const reDest = await geocodeLocation(destQuery, { lat: originLoc.lat, lon: originLoc.lon }, originCity);
          const reDist = haversineDist(originLoc.lat, originLoc.lon, reDest.lat, reDest.lon);
          if (reDist < dist) {
            destLoc = reDest;
            dist = reDist;
          }
        } catch (_e) {}
      }

      // 2. Run core algorithm
      const result = await engine.analyzeRoute({
        origin: originLoc,
        destination: destLoc,
        activityType: selectedActivity,
        profile: profileState
      });

      // 3. Render UI Results
      showLoading(false);
      renderResults(result);
    } catch (err) {
      showLoading(false);
      alert("Error analyzing route: " + err.message);
    }
  }

  function showLoading(isLoading) {
    if (isLoading) {
      loadingOverlay.style.display = 'block';
      resultsContent.style.display = 'none';
    } else {
      loadingOverlay.style.display = 'none';
      resultsContent.style.display = 'flex';
    }
  }

  function renderResults(res) {
    // Verdict
    verdictTitle.textContent = res.verdict;
    riskBadge.textContent = res.effectiveRiskLevel.label;
    riskBadge.style.backgroundColor = res.effectiveRiskLevel.bgColor;
    riskBadge.style.color = res.effectiveRiskLevel.colorHex;

    verdictBanner.style.backgroundColor = `${res.effectiveRiskLevel.colorHex}15`;
    verdictBanner.style.borderColor = `${res.effectiveRiskLevel.colorHex}40`;

    // Metrics
    valAvgAqi.textContent = res.overallAqi;
    valAvgAqi.style.color = res.effectiveRiskLevel.colorHex;
    valDuration.textContent = res.durationMinutes;
    valDistance.textContent = res.distanceKm;
    valInhaled.textContent = res.inhaledPm25Ug;

    // Timeline Segments
    timelineContainer.innerHTML = '';
    res.segments.forEach((seg, idx) => {
      const item = document.createElement('div');
      item.className = 'segment-item';

      const barWidth = Math.min(100, Math.max(10, (seg.aqi / 300) * 100));

      item.innerHTML = `
        <div class="segment-info">
          <div class="segment-node" style="color: ${seg.riskLevel.colorHex}; border: 1px solid ${seg.riskLevel.colorHex}">${idx + 1}</div>
          <div>
            <div class="segment-name">${seg.name}</div>
            <div class="segment-coords">PM2.5: ${seg.pm25.toFixed(1)} µg/m³</div>
          </div>
        </div>
        <div class="segment-aqi-box">
          <div class="segment-bar-wrapper">
            <div class="segment-bar-fill" style="width: ${barWidth}%; background-color: ${seg.riskLevel.colorHex}"></div>
          </div>
          <div class="segment-aqi-val" style="color: ${seg.riskLevel.colorHex}">${seg.aqi}</div>
        </div>
      `;
      timelineContainer.appendChild(item);
    });

    // Render Canvas Graphic
    drawRouteCanvas(res.segments);

    // Render Live Interactive Map
    renderLeafletMap(res);

    // Recommendations
    recsContainer.innerHTML = '';
    res.recommendations.forEach(rec => {
      const li = document.createElement('li');
      li.className = 'rec-item';
      li.innerHTML = `<span class="rec-icon">⚡</span> <span>${rec}</span>`;
      recsContainer.appendChild(li);
    });

    // Alternative Route Box
    const alt = res.alternativeCleanRoute;
    altBox.innerHTML = `
      <div>
        <div class="alt-info-title">🌿 Air-Quality Clean Corridor Option</div>
        <div class="alt-info-desc">
          Bypasses pollution hotspots. Distance: <b>${alt.distanceKm} km</b> (${alt.durationMinutes} min). 
          Estimated inhaled PM2.5: <b>${alt.inhaledPm25Ug} µg</b>.
        </div>
      </div>
      <div class="alt-stat-badge">
        -${alt.reductionPercent}% Exposure
      </div>
    `;
  }

  function drawRouteCanvas(segments) {
    const ctx = routeCanvas.getContext('2d');
    const w = routeCanvas.width = routeCanvas.offsetWidth || 500;
    const h = routeCanvas.height = routeCanvas.offsetHeight || 180;

    ctx.clearRect(0, 0, w, h);

    if (segments.length < 2) return;

    // Draw subtle grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let y = 30; y < h; y += 35) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const paddingX = 45;
    const paddingY = 40;
    const availableW = w - paddingX * 2;
    const availableH = h - paddingY * 2;

    const maxAqi = Math.max(120, ...segments.map(s => s.aqi));

    const points = segments.map((seg, i) => {
      const x = paddingX + (i / (segments.length - 1)) * availableW;
      const y = h - paddingY - (seg.aqi / maxAqi) * availableH;
      return { x, y, seg };
    });

    // Draw Smooth Bezier Fill Gradient Area
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.35)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.02)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, h - paddingY);
    ctx.lineTo(points[0].x, points[0].y);

    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.lineTo(points[points.length - 1].x, h - paddingY);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw Smooth Line Stroke
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = 'rgba(59, 130, 246, 0.6)';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0; // reset shadow

    // Draw Waypoint Node Dots & Labels
    points.forEach((p, idx) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7.5, 0, Math.PI * 2);
      ctx.fillStyle = p.seg.riskLevel.colorHex;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Waypoint AQI & Title Labels
      ctx.fillStyle = '#f9fafb';
      ctx.font = '600 11px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`AQI ${p.seg.aqi}`, p.x, p.y - 14);

      ctx.fillStyle = '#9ca3af';
      ctx.font = '500 10px Outfit, sans-serif';
      ctx.fillText(p.seg.name, p.x, h - 15);
    });
  }

  // --- Leaflet Interactive Map Rendering ---
  let leafletMap = null;
  let mapMarkers = [];
  let mapPolylines = [];

  function renderLeafletMap(res) {
    const mapEl = document.getElementById('map-container');
    if (!mapEl || typeof L === 'undefined') return;

    if (!leafletMap) {
      leafletMap = L.map('map-container').setView([51.505, -0.09], 13);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(leafletMap);
    }

    // Clear existing markers and polylines
    mapMarkers.forEach(m => leafletMap.removeLayer(m));
    mapPolylines.forEach(p => leafletMap.removeLayer(p));
    mapMarkers = [];
    mapPolylines = [];

    const segments = res.segments;
    if (!segments || segments.length === 0) return;

    const wayLatLngs = segments.map(s => [s.lat, s.lon]);

    // Draw real road polyline or straight dashed polyline
    if (res.roadCoordinates && res.roadCoordinates.length > 0) {
      const roadLine = L.polyline(res.roadCoordinates, {
        color: res.effectiveRiskLevel.colorHex,
        weight: 5,
        opacity: 0.85
      }).addTo(leafletMap);
      mapPolylines.push(roadLine);
    } else {
      const straightLine = L.polyline(wayLatLngs, {
        color: res.effectiveRiskLevel.colorHex,
        weight: 5,
        dashArray: '8, 8',
        opacity: 0.85
      }).addTo(leafletMap);
      mapPolylines.push(straightLine);
    }

    // Add Waypoint Markers with AQI Popups
    segments.forEach((seg, idx) => {
      const iconHtml = `<div style="background:${seg.riskLevel.colorHex}; color:#fff; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px; border:2px solid #fff; box-shadow:0 0 12px ${seg.riskLevel.colorHex};">${idx + 1}</div>`;
      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-map-icon',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([seg.lat, seg.lon], { icon: customIcon }).addTo(leafletMap);
      marker.bindPopup(`
        <div style="font-family: Outfit, sans-serif; padding:4px;">
          <strong style="font-size:14px; color:#ffffff;">${seg.name}</strong><br/>
          <span style="color:${seg.riskLevel.colorHex}; font-weight:bold;">AQI ${seg.aqi} (${seg.riskLevel.label})</span><br/>
          <small style="color:#9ca3af;">PM2.5: ${seg.pm25.toFixed(1)} µg/m³</small>
        </div>
      `, { className: 'custom-map-popup' });

      mapMarkers.push(marker);
    });

    // Fit map bounds to show full route
    const bounds = L.latLngBounds(wayLatLngs);
    leafletMap.fitBounds(bounds, { padding: [45, 45] });

    // Refresh tile size after render
    setTimeout(() => leafletMap.invalidateSize(), 300);
  }

  // Initial trigger
  triggerAnalysis();
});
