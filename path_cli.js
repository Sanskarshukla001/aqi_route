/**
 * PATH ROUTE ALGORITHM CLI RUNNER
 * Usage: node path_cli.js "New York" "Central Park" WALK
 */

import { PathRiskEngine, geocodeLocation } from './path_risk_algorithm.js';

async function runCli() {
  const args = process.argv.slice(2);
  const startQuery = args[0] || "London Eye";
  const destQuery = args[1] || "Hyde Park";
  const activityType = (args[2] || "WALK").toUpperCase();

  console.log(`\n======================================================`);
  console.log(` 🚀 PATH AIR QUALITY ROUTE & RISK ALGORITHM ENGINE `);
  console.log(`======================================================`);
  console.log(`📍 Origin Query:       "${startQuery}"`);
  console.log(`🏁 Destination Query:  "${destQuery}"`);
  console.log(`🏃 Activity Type:      ${activityType}\n`);

  console.log(`🔍 Geocoding locations via OpenStreetMap Nominatim...`);
  const originLoc = await geocodeLocation(startQuery);
  const destLoc = await geocodeLocation(destQuery);

  console.log(` -> Origin Resolved:      ${originLoc.displayName || originLoc.name} (${originLoc.lat.toFixed(4)}, ${originLoc.lon.toFixed(4)})`);
  console.log(` -> Destination Resolved: ${destLoc.displayName || destLoc.name} (${destLoc.lat.toFixed(4)}, ${destLoc.lon.toFixed(4)})\n`);

  console.log(`⚡ Analyzing route air quality micro-segments & inhaled PM2.5 dose...`);
  const engine = new PathRiskEngine();

  const userProfile = {
    hasAsthma: true,
    isElderly: false,
    hasChildren: false,
    isOutdoorWorker: false
  };

  const result = await engine.analyzeRoute({
    origin: originLoc,
    destination: destLoc,
    activityType,
    profile: userProfile
  });

  console.log(`\n------------------ ANALYSIS RESULTS ------------------`);
  console.log(`🛣️  Distance:             ${result.distanceKm} km`);
  console.log(`⏱️  Estimated Duration:   ${result.durationMinutes} min`);
  console.log(`💨 Avg EPA AQI:          ${result.overallAqi} (${result.effectiveRiskLevel.label})`);
  console.log(`⚠️  Peak AQI on Route:    ${result.peakAqi}`);
  console.log(`🫁 Total Inhaled PM2.5:   ${result.inhaledPm25Ug} µg`);
  console.log(`📢 Verdict:              "${result.verdict}"\n`);

  console.log(`📊 ROUTE BREAKDOWN BY WAYPOINT:`);
  result.segments.forEach((seg, i) => {
    const bar = "█".repeat(Math.round(seg.aqi / 10));
    console.log(`   [${i + 1}] ${seg.name.padEnd(16)} | AQI ${String(seg.aqi).padStart(3)} | PM2.5 ${seg.pm25.toFixed(1)} µg/m³ | ${seg.riskLevel.label.padEnd(28)} | ${bar}`);
  });

  console.log(`\n🌱 CLEAN AIR ALTERNATIVE ROUTE DETOUR:`);
  console.log(`   Avg AQI: ${result.alternativeCleanRoute.avgAqi} (${result.alternativeCleanRoute.reductionPercent}% lower exposure)`);
  console.log(`   Est Distance: ${result.alternativeCleanRoute.distanceKm} km | Est Duration: ${result.alternativeCleanRoute.durationMinutes} min`);
  console.log(`   Inhaled PM2.5: ${result.alternativeCleanRoute.inhaledPm25Ug} µg`);

  console.log(`\n💡 HEALTH GUIDANCE & ADVISORIES:`);
  result.recommendations.forEach(r => console.log(`   • ${r}`));
  console.log(`======================================================\n`);
}

runCli().catch(err => {
  console.error("CLI Execution Error:", err);
});
