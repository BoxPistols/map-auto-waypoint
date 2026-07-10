/**
 * リスク判定サービス (集約モジュール)
 *
 * Phase 2対応: RBush空間インデックスによる高速衝突検出を使用
 * 機能別に分割:
 *  - airspaceCheck:  空域制限・最寄り空港
 *  - didCheck:       DID（人口集中地区）判定
 *  - pathCollision:  経路・ポリゴンの衝突判定
 *  - analysis:       総合リスク分析・申請コスト
 *  - collisionDetails: 詳細衝突結果（制限表面対応）
 *  - _spatialIndex:  内部の空間インデックス管理
 */

// CollisionService は lib 側のため直接 re-export
import { CollisionService } from '../../lib';

export * from './airspaceCheck';
export * from './didCheck';
export * from './pathCollision';
export * from './analysis';
export * from './collisionDetails';
export { refreshSpatialIndex } from './_spatialIndex';
export { CollisionService };
