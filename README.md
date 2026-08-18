# PATH — Air Quality & Health Exposure Route Algorithm Suite

> Advanced Air Quality Micro-Segment Sampling, Inhaled Particulate Dose (`PM2.5`) Calculation, and Profile-Escalated Risk Engine for Mobile & Web Applications.

---

## 🌟 Technology Stack & Architecture

Extracted & generalized from the core algorithms of **HackInMotion Jivan AirQuality** (`com.jivan.airquality`):

1. **Haversine Distance & Micro-Waypoint Interpolation (`path_risk_algorithm.js`)**
   - Computes precise spherical arc distances between any pair of geographic coordinates `(lat, lon)`.
   - Divides any origin-destination route into $N$ micro-segments to sample spatial ambient pollution variations.

2. **US EPA Air Quality Index (AQI) Calculation Standard**
   - Converts raw particulate matter concentrations ($\mu\text{g/m}^3$) into standard EPA AQI index values ($0 - 500$) using piecewise linear concentration equations:
     $$I_p = \frac{I_{\text{high}} - I_{\text{low}}}{C_{\text{high}} - C_{\text{low}}} (C_p - C_{\text{low}}) + I_{\text{low}}$$
   - Classifies risk into 6 standard categories: **Good**, **Moderate**, **Unhealthy for Sensitive Groups**, **Unhealthy**, **Very Unhealthy**, **Hazardous**.

3. **Activity-Adjusted Inhaled Dose Estimator ($\mu\text{g}$ PM2.5)**
   - Computes cumulative mass of fine particulate matter inhaled by the user during trip:
     $$\text{Dose}_{\text{PM2.5}} = \text{Avg PM2.5 } (\mu\text{g/m}^3) \times \text{Duration (min)} \times \text{Minute Ventilation Rate } (m^3/\text{min})$$
   - Minute ventilation rates based on activity mode:
     - **Walk** (4.8 km/h): $0.015\text{ m}^3/\text{min}$
     - **Jog** (8.0 km/h): $0.040\text{ m}^3/\text{min}$
     - **Cycle** (15.0 km/h): $0.025\text{ m}^3/\text{min}$

4. **User Profile Health Risk Escalation**
   - Dynamically elevates risk sensitivity and alerts based on user health flags:
     - **Asthma / Respiratory Conditions**: Reduces threshold for exposure alerts and recommends quick-relief inhaler readiness.
     - **Seniors / Children**: Scales down recommended exertion levels.
     - **Outdoor Workers**: Recommends N95/FFP2 protective equipment when AQI exceeds sensitive limits.

5. **Clean Corridor Detour Optimization**
   - Calculates clean alternative path detour options, providing quantifiable exposure reduction percentages (e.g., `-28% exposure`).

6. **Live Data APIs**
   - **Open-Meteo Air Quality API**: Real-time US EPA AQI, PM2.5, PM10, NO2, O3, SO2, CO, and hourly forecasting.
   - **OpenStreetMap Nominatim Geocoding**: Free-text place resolution into coordinates.

---

## 📁 Repository Structure

```
path/
├── index.html              # Modern dark glassmorphic Web App UI
├── styles.css              # CSS Design Tokens & Glassmorphism Theme
├── app.js                  # Frontend Application Controller & SVG Canvas Renderer
├── path_risk_algorithm.js  # Core Algorithm & API Engine (Exportable JS Module)
├── path_cli.js             # Command-Line Interface Runner
├── package.json            # Node.js ES Module Configuration
└── README.md               # Technical Documentation
```

---

## 🚀 Usage

### 1. Web Application Interactive Dashboard
Open [`index.html`](file:///c:/Users/Hp/OneDrive/Documents/Desktop/path/index.html) in any web browser to interactively test route queries, select activity modes, toggle health profiles, and view the route risk breakdown, elevation chart, and clean corridor alternative.

### 2. Node.js CLI Command Line
Run the algorithm directly from terminal:
```bash
node path_cli.js "London Eye" "Hyde Park" WALK
```
Or with custom locations:
```bash
node path_cli.js "Times Square, NY" "Central Park, NY" JOG
```

### 3. ES Module Import (For Apps / Libraries)
```javascript
import { PathRiskEngine, geocodeLocation } from './path_risk_algorithm.js';

const engine = new PathRiskEngine();
const result = await engine.analyzeRoute({
  origin: { name: "London", lat: 51.5074, lon: -0.1278 },
  destination: { name: "Oxford", lat: 51.7520, lon: -1.2577 },
  activityType: "WALK",
  profile: { hasAsthma: true }
});

console.log(`Avg AQI: ${result.overallAqi}, Inhaled PM2.5: ${result.inhaledPm25Ug} µg`);
```
