/**
 * 支援サービス
 * 機体推奨、UTM干渉チェックなど
 */

import { getDistanceMeters } from '../utils/geoUtils';

// ===== 機体推奨 =====

const AIRCRAFT_DATABASE = [
  {
    id: 'matrice-300-rtk',
    model: 'DJI Matrice 300 RTK',
    manufacturer: 'DJI',
    category: 'enterprise',
    specs: { maxFlightTime: 55, rtk: true, thermalCamera: true },
    suitableFor: ['survey', 'inspection', 'mapping', 'thermal'],
    price: 'high'
  },
  {
    id: 'mavic-3-enterprise',
    model: 'DJI Mavic 3 Enterprise',
    manufacturer: 'DJI',
    category: 'enterprise',
    specs: { maxFlightTime: 45, rtk: true, thermalCamera: true },
    suitableFor: ['inspection', 'survey', 'thermal', 'general'],
    price: 'medium'
  }
];

export const recommendAircraft = (purpose, requirements = {}) => {
  const { flightTime = 30 } = requirements;
  let missionType = 'general';
  if (purpose.includes('測量')) missionType = 'survey';
  else if (purpose.includes('点検')) missionType = 'inspection';

  return AIRCRAFT_DATABASE.map(aircraft => {
    let score = 50;
    if (aircraft.suitableFor.includes(missionType)) score += 30;
    if (aircraft.specs.maxFlightTime >= flightTime) score += 10;
    return { ...aircraft, suitability: score };
  }).sort((a, b) => b.suitability - a.suitability);
};

// ===== UTM干渉チェック =====

const SIMULATED_UTM_FLIGHTS = [
  {
    id: 'UTM-2024-001',
    area: { lat: 35.68, lng: 139.76, radius: 500 },
    timeSlots: ['09:00-12:00']
  }
];

export const checkUTMConflicts = (flightPlan) => {
  const { center } = flightPlan;
  if (!center) return { checked: false, message: '位置情報なし' };

  const conflicts = [];
  for (const flight of SIMULATED_UTM_FLIGHTS) {
    const dist = getDistanceMeters(center.lat, center.lng, flight.area.lat, flight.area.lng);
    if (dist < flight.area.radius + 500) {
      conflicts.push({ id: flight.id, severity: 'WARNING', message: '近隣で飛行計画あり' });
    }
  }

  return {
    checked: true,
    conflicts,
    clearForFlight: conflicts.length === 0,
    message: conflicts.length > 0 ? 'UTM干渉の可能性' : '干渉なし'
  };
};
