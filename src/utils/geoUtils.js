/**
 * 地理計算ユーティリティ
 */

/**
 * 2点間の距離を計算 (Haversine formula)
 * @param {number} lat1 緯度1
 * @param {number} lng1 経度1
 * @param {number} lat2 緯度2
 * @param {number} lng2 経度2
 * @returns {number} 距離 (メートル)
 */
export const getDistanceMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000; // 地球の半径 (m)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
