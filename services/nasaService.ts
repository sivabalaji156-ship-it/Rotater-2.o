import { NASA_API_KEY } from '../constants';
import { ClimateStats, Calamity } from '../types';

const BASE_URL = "https://power.larc.nasa.gov/api/temporal/monthly/point";

export const fetchClimateData = async (lat: number, lon: number, startYear: number, endYear: number): Promise<ClimateStats[]> => {
  // NASA POWER Monthly API often lags by a few months. Requesting the current year usually results in a 400 Error.
  // We clamp the API request to the previous year to ensure success.
  const currentYear = new Date().getFullYear();
  let apiEndYear = endYear >= currentYear ? currentYear - 1 : endYear;

  // If the start year is also in the future relative to API availability, return mock data entirely.
  if (startYear > apiEndYear) {
    console.warn("Request range beyond NASA data availability, using simulation.");
    return generateMockData(startYear, endYear);
  }

  const params = "T2M,PRECTOTCORR";
  const url = `${BASE_URL}?parameters=${params}&community=AG&longitude=${lon}&latitude=${lat}&start=${startYear}&end=${apiEndYear}&format=JSON`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      // Log more details for debugging
      const errorBody = await response.text().catch(() => "");
      throw new Error(`NASA API Error: ${response.status} ${response.statusText} ${errorBody}`);
    }
    const data = await response.json();
    const properties = data.properties?.parameter;

    if (!properties || !properties.T2M || !properties.PRECTOTCORR) {
        throw new Error("Invalid NASA API response structure");
    }

    const stats: ClimateStats[] = [];
    const dates = Object.keys(properties.T2M).sort();

    dates.forEach(date => {
      const temp = properties.T2M[date];
      const rain = properties.PRECTOTCORR[date];
      
      const year = parseInt(date.substring(0, 4));
      const month = parseInt(date.substring(4, 6));

      // Simulate NDVI and Anomalies (NASA POWER doesn't provide these easily in this endpoint)
      let simulatedNDVI = 0.3;
      if (month >= 5 && month <= 9) simulatedNDVI = 0.7; // Summer (Northern Hemisphere)
      if (lat < 0) simulatedNDVI = (month >= 11 || month <= 3) ? 0.7 : 0.3; // Summer (Southern Hemisphere)

      const anomaly = (Math.random() * 2 - 1) * 1.5;

      if (temp !== -999 && rain !== -999) {
        stats.push({
          date: `${year}-${month.toString().padStart(2, '0')}`,
          temperature: temp,
          rainfall: rain,
          ndvi: parseFloat((simulatedNDVI + (Math.random() * 0.1)).toFixed(2)),
          anomaly: parseFloat(anomaly.toFixed(2))
        });
      }
    });

    // Fill the gap if the user requested up to currentYear but we only fetched up to currentYear - 1
    if (endYear > apiEndYear) {
        const gapStats = generateMockData(apiEndYear + 1, endYear);
        stats.push(...gapStats);
    }

    return stats;
  } catch (error) {
    console.error("Failed to fetch NASA data:", error);
    // Fallback to full mock data on failure to ensure app stability
    return generateMockData(startYear, endYear);
  }
};

const generateMockData = (start: number, end: number): ClimateStats[] => {
  const stats: ClimateStats[] = [];
  const now = new Date();
  
  for (let y = start; y <= end; y++) {
    for (let m = 1; m <= 12; m++) {
      // Prevent generating future data beyond current month if it's the current year
      if (y === now.getFullYear() && m > now.getMonth() + 1) continue;
      if (y > now.getFullYear()) continue;

      stats.push({
        date: `${y}-${m.toString().padStart(2, '0')}`,
        temperature: 15 + Math.sin(m / 2) * 10 + (y - start) * 0.1,
        rainfall: Math.random() * 100,
        ndvi: 0.4 + Math.random() * 0.4,
        anomaly: (Math.random() - 0.5) * 2
      });
    }
  }
  return stats;
};

export const fetchCalamityHistory = (lat: number, lon: number): Calamity[] => {
  // Mocking calamity data based on location lat/lon heuristics
  // Real implementation would query NOAA or EM-DAT databases
  const calamities: Calamity[] = [];
  const years = [2018, 2020, 2022, 2023];
  
  years.forEach(year => {
    if (Math.random() > 0.5) {
      calamities.push({
        year,
        type: Math.random() > 0.5 ? 'Flood' : 'Heatwave',
        intensity: Math.random() > 0.5 ? 'Severe' : 'Moderate',
        month: '07'
      });
    }
  });
  return calamities;
};