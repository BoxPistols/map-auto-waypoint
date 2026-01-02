/**
 * reinfolibService テスト
 *
 * 外部APIには依存せず、純粋関数（集計）をテストする。
 */

import { describe, it, expect } from 'vitest';
import { summarizeDisasterHistory } from './reinfolibService';

describe('reinfolibService', () => {
  describe('summarizeDisasterHistory', () => {
    it('空入力で空サマリーを返す', () => {
      expect(summarizeDisasterHistory(null)).toEqual({
        total: 0,
        byType: [],
        yearRange: { min: null, max: null }
      });
    });

    it('災害履歴をタイプ別・年代レンジで集計する', () => {
      const fc = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [139.0, 35.0] },
            properties: { disastertype_code: '11', disaster_date: '19740707' }
          },
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [139.0, 35.0] },
            properties: { disastertype_code: '11', disaster_date: '00000000' } // 年代不明
          },
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [139.0, 35.0] },
            properties: { disastertype_code: '12', disaster_date: '20110311' }
          }
        ]
      };

      const summary = summarizeDisasterHistory(fc);

      expect(summary.total).toBe(3);
      expect(summary.yearRange).toEqual({ min: 1974, max: 2011 });

      // 件数順（11が2件で先頭）
      expect(summary.byType[0].code).toBe('11');
      expect(summary.byType[0].count).toBe(2);
      expect(summary.byType[1].code).toBe('12');
      expect(summary.byType[1].count).toBe(1);
    });
  });
});

