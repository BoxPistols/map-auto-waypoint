/**
 * MapControls Component
 *
 * 地図レイヤーコントロールパネル
 */

import { Layers, Users, ShieldAlert, Plane, CloudRain, Signal, Building2, Zap, Building, Shield, Lock, Target, Landmark, AlertTriangle, Radio, MapPinned, Map as MapIcon, Wind, Wifi } from 'lucide-react'
import ControlGroup from './ControlGroup'
import styles from './Map.module.scss'

const MapControls = ({
  layerVisibility,
  setLayerVisibility,
  toggleLayer,
  toggleAirportOverlay,
  toggleGroupLayers,
  favoriteGroups,
  toggleFavoriteGroup,
  isMobile,
  mobileControlsExpanded,
}) => {
  return (
        <div className={`${styles.controlsGroup} ${isMobile && !mobileControlsExpanded ? styles.hidden : ''}`}>
          {/* ALL - 飛行制限レイヤー一括制御 */}
          <ControlGroup
            id="all-layers"
            icon={<Layers size={18} />}
            label="ALL"
            tooltip="飛行制限レイヤーを一括ON/OFF"
            defaultExpanded={false}
            groupToggle={true}
            groupEnabled={
              layerVisibility.showDID ||
              layerVisibility.showRedZones ||
              layerVisibility.showYellowZones ||
              layerVisibility.showNuclearPlants ||
              layerVisibility.showPrefectures ||
              layerVisibility.showPolice ||
              layerVisibility.showPrisons ||
              layerVisibility.showJSDF ||
              layerVisibility.showAirportZones ||
              layerVisibility.showRestrictionSurfaces ||
              layerVisibility.showHeliports ||
              layerVisibility.showEmergencyAirspace ||
              layerVisibility.showRemoteIdZones ||
              layerVisibility.showMannedAircraftZones
            }
            indeterminate={
              (() => {
                const allLayers = [
                  layerVisibility.showDID,
                  layerVisibility.showRedZones,
                  layerVisibility.showYellowZones,
                  layerVisibility.showNuclearPlants,
                  layerVisibility.showPrefectures,
                  layerVisibility.showPolice,
                  layerVisibility.showPrisons,
                  layerVisibility.showJSDF,
                  layerVisibility.showAirportZones,
                  layerVisibility.showRestrictionSurfaces,
                  layerVisibility.showHeliports,
                  layerVisibility.showEmergencyAirspace,
                  layerVisibility.showRemoteIdZones,
                  layerVisibility.showMannedAircraftZones
                ]
                const anyEnabled = allLayers.some(v => v)
                const allEnabled = allLayers.every(v => v)
                return anyEnabled && !allEnabled
              })()
            }
            onGroupToggle={(enabled) => {
              const updates = {
                showDID: enabled,
                showRedZones: enabled,
                showYellowZones: enabled,
                showNuclearPlants: enabled,
                showPrefectures: enabled,
                showPolice: enabled,
                showPrisons: enabled,
                showJSDF: enabled,
                showHeliports: enabled,
                showEmergencyAirspace: enabled,
                showRemoteIdZones: enabled,
                showMannedAircraftZones: enabled
              }
              if (enabled) {
                updates.showAirportZones = true
                updates.showRestrictionSurfaces = true
              } else {
                updates.showAirportZones = false
                updates.showRestrictionSurfaces = false
              }
              setLayerVisibility(prev => ({ ...prev, ...updates }))
            }}
            favoritable={true}
            isFavorite={favoriteGroups.has('all')}
            onFavoriteToggle={() => toggleFavoriteGroup('all')}
          />

          {/* DID（人口密集地 - 禁止区域） */}
          <ControlGroup
            id="did"
            icon={<Users size={18} />}
            label="DID"
            tooltip="国勢調査に基づく人口密集地 - 許可なし飛行禁止 [D]"
            defaultExpanded={false}
            groupToggle={true}
            groupEnabled={layerVisibility.showDID}
            onGroupToggle={(_enabled) => toggleLayer('showDID')}
            favoritable={true}
            isFavorite={favoriteGroups.has('did')}
            onFavoriteToggle={() => toggleFavoriteGroup('did')}
          />

          {/* グループ1: 禁止区域 */}
          <ControlGroup
            id="restricted"
            icon={<ShieldAlert size={18} />}
            label="禁止区域"
            tooltip="飛行禁止・制限区域の各種施設"
            defaultExpanded={false}
            groupToggle={true}
            groupEnabled={
              layerVisibility.showRedZones ||
              layerVisibility.showYellowZones ||
              layerVisibility.showNuclearPlants ||
              layerVisibility.showPrefectures ||
              layerVisibility.showPolice ||
              layerVisibility.showPrisons ||
              layerVisibility.showJSDF
            }
            indeterminate={
              (() => {
                const layers = [
                  layerVisibility.showRedZones,
                  layerVisibility.showYellowZones,
                  layerVisibility.showNuclearPlants,
                  layerVisibility.showPrefectures,
                  layerVisibility.showPolice,
                  layerVisibility.showPrisons,
                  layerVisibility.showJSDF
                ]
                const anyEnabled = layers.some(v => v)
                const allEnabled = layers.every(v => v)
                return anyEnabled && !allEnabled
              })()
            }
            onGroupToggle={(enabled) => {
              toggleGroupLayers([
                'showRedZones',
                'showYellowZones',
                'showNuclearPlants',
                'showPrefectures',
                'showPolice',
                'showPrisons',
                'showJSDF'
              ], enabled)
            }}
            favoritable={true}
            isFavorite={favoriteGroups.has('restricted')}
            onFavoriteToggle={() => toggleFavoriteGroup('restricted')}
          >
            <button
              className={`${styles.toggleButton} ${layerVisibility.showRedZones ? styles.activeRed : ''}`}
              onClick={() => toggleLayer('showRedZones')}
              data-tooltip="政府機関・原発など飛行禁止区域 [R]"
              data-tooltip-pos="left"
            >
              <ShieldAlert size={18} />
              <span className={styles.buttonLabel}>レッドゾーン</span>
            </button>
            <button
              className={`${styles.toggleButton} ${layerVisibility.showYellowZones ? styles.activeYellow : ''}`}
              onClick={() => toggleLayer('showYellowZones')}
              data-tooltip="重要施設周辺の要事前調整区域 [Y]"
              data-tooltip-pos="left"
            >
              <Building2 size={18} />
              <span className={styles.buttonLabel}>イエローゾーン</span>
            </button>
            <button
              className={`${styles.toggleButton} ${layerVisibility.showNuclearPlants ? styles.activeNuclear : ''}`}
              onClick={() => toggleLayer('showNuclearPlants')}
              data-tooltip="原発施設の位置と稼働状況 [Q]"
              data-tooltip-pos="left"
            >
              <Zap size={18} />
              <span className={styles.buttonLabel}>原発</span>
            </button>
            <button
              className={`${styles.toggleButton} ${layerVisibility.showPrefectures ? styles.activePrefecture : ''}`}
              onClick={() => toggleLayer('showPrefectures')}
              data-tooltip="都道府県庁舎の位置 [p]"
              data-tooltip-pos="left"
            >
              <Building size={18} />
              <span className={styles.buttonLabel}>県庁</span>
            </button>
            <button
              className={`${styles.toggleButton} ${layerVisibility.showPolice ? styles.activePolice : ''}`}
              onClick={() => toggleLayer('showPolice')}
              data-tooltip="警察本部・警察署の位置 [K]"
              data-tooltip-pos="left"
            >
              <Shield size={18} />
              <span className={styles.buttonLabel}>警察</span>
            </button>
            <button
              className={`${styles.toggleButton} ${layerVisibility.showPrisons ? styles.activePrison : ''}`}
              onClick={() => toggleLayer('showPrisons')}
              data-tooltip="矯正施設の位置 [J]"
              data-tooltip-pos="left"
            >
              <Lock size={18} />
              <span className={styles.buttonLabel}>刑務所</span>
            </button>
            <button
              className={`${styles.toggleButton} ${layerVisibility.showJSDF ? styles.activeJSDF : ''}`}
              onClick={() => toggleLayer('showJSDF')}
              data-tooltip="自衛隊基地・駐屯地の位置 [B]"
              data-tooltip-pos="left"
            >
              <Target size={18} />
              <span className={styles.buttonLabel}>自衛隊</span>
            </button>
          </ControlGroup>

          {/* グループ2: 航空制限 */}
          <ControlGroup
            id="aviation"
            icon={<Plane size={18} />}
            label="航空制限"
            tooltip="航空法に基づく飛行制限区域"
            defaultExpanded={false}
            groupToggle={true}
            groupEnabled={
              layerVisibility.showAirportZones ||
              layerVisibility.showRestrictionSurfaces ||
              layerVisibility.showHeliports ||
              layerVisibility.showEmergencyAirspace ||
              layerVisibility.showRemoteIdZones ||
              layerVisibility.showMannedAircraftZones
            }
            indeterminate={
              (() => {
                const layers = [
                  layerVisibility.showAirportZones,
                  layerVisibility.showRestrictionSurfaces,
                  layerVisibility.showHeliports,
                  layerVisibility.showEmergencyAirspace,
                  layerVisibility.showRemoteIdZones,
                  layerVisibility.showMannedAircraftZones
                ]
                const anyEnabled = layers.some(v => v)
                const allEnabled = layers.every(v => v)
                return anyEnabled && !allEnabled
              })()
            }
            onGroupToggle={(enabled) => {
              const updates = {
                showHeliports: enabled,
                showEmergencyAirspace: enabled,
                showRemoteIdZones: enabled,
                showMannedAircraftZones: enabled
              }
              if (enabled) {
                updates.showAirportZones = true
                updates.showRestrictionSurfaces = true
              } else {
                updates.showAirportZones = false
                updates.showRestrictionSurfaces = false
              }
              setLayerVisibility(prev => ({ ...prev, ...updates }))
            }}
            favoritable={true}
            isFavorite={favoriteGroups.has('aviation')}
            onFavoriteToggle={() => toggleFavoriteGroup('aviation')}
          >
            <button
              className={`${styles.toggleButton} ${layerVisibility.showAirportZones ? styles.activeAirport : ''}`}
              onClick={toggleAirportOverlay}
              data-tooltip="空港周辺の高度制限区域 [A]"
              data-tooltip-pos="left"
            >
              <Plane size={18} />
              <span className={styles.buttonLabel}>空港</span>
            </button>
            <button
              className={`${styles.toggleButton} ${layerVisibility.showHeliports ? styles.activeHeliport : ''}`}
              onClick={() => toggleLayer('showHeliports')}
              data-tooltip="ヘリポート施設の位置 [H]"
              data-tooltip-pos="left"
            >
              <Landmark size={18} />
              <span className={styles.buttonLabel}>ヘリポート</span>
            </button>
            <button
              className={`${styles.toggleButton} ${layerVisibility.showEmergencyAirspace ? styles.activeEmergency : ''}`}
              onClick={() => toggleLayer('showEmergencyAirspace')}
              data-tooltip="救急・消防ヘリの飛行区域 [E]"
              data-tooltip-pos="left"
            >
              <AlertTriangle size={18} />
              <span className={styles.buttonLabel}>緊急</span>
            </button>
            <button
              className={`${styles.toggleButton} ${layerVisibility.showRemoteIdZones ? styles.activeRemoteId : ''}`}
              onClick={() => toggleLayer('showRemoteIdZones')}
              data-tooltip="リモートID義務化予定区域 [I]"
              data-tooltip-pos="left"
            >
              <Radio size={18} />
              <span className={styles.buttonLabel}>RemoteID</span>
            </button>
            <button
              className={`${styles.toggleButton} ${layerVisibility.showMannedAircraftZones ? styles.activeMannedAircraft : ''}`}
              onClick={() => toggleLayer('showMannedAircraftZones')}
              data-tooltip="有人航空機の離着陸区域 [U]"
              data-tooltip-pos="left"
            >
              <MapPinned size={18} />
              <span className={styles.buttonLabel}>有人機</span>
            </button>
          </ControlGroup>

          {/* グループ3: 環境 */}
          <ControlGroup
            id="environment"
            icon={<CloudRain size={18} />}
            label="環境"
            tooltip="気象・地理情報データレイヤー"
            defaultExpanded={false}
            groupToggle={true}
            groupEnabled={
              layerVisibility.showGeoFeatures ||
              layerVisibility.showRainCloud
            }
            indeterminate={
              (() => {
                const layers = [
                  layerVisibility.showGeoFeatures,
                  layerVisibility.showRainCloud
                ]
                const anyEnabled = layers.some(v => v)
                const allEnabled = layers.every(v => v)
                return anyEnabled && !allEnabled
              })()
            }
            onGroupToggle={(enabled) => {
              toggleGroupLayers([
                'showGeoFeatures',
                'showRainCloud'
              ], enabled)
            }}
            favoritable={true}
            isFavorite={favoriteGroups.has('environment')}
            onFavoriteToggle={() => toggleFavoriteGroup('environment')}
          >
            <button
              className={`${styles.toggleButton} ${layerVisibility.showGeoFeatures ? styles.activeGeoFeatures : ''}`}
              onClick={() => toggleLayer('showGeoFeatures')}
              data-tooltip="建物・道路などの地理情報 [G]"
              data-tooltip-pos="left"
            >
              <MapIcon size={18} />
              <span className={styles.buttonLabel}>地物</span>
            </button>
            <button
              className={`${styles.toggleButton} ${layerVisibility.showRainCloud ? styles.activeRainCloud : ''}`}
              onClick={() => toggleLayer('showRainCloud')}
              data-tooltip="リアルタイム降雨情報 [N]"
              data-tooltip-pos="left"
            >
              <CloudRain size={18} />
              <span className={styles.buttonLabel}>雨雲</span>
            </button>
            <button
              className={`${styles.toggleButton} ${styles.disabled}`}
              disabled
              data-tooltip="リアルタイム風況情報 [O] (準備中)"
              data-tooltip-pos="left"
            >
              <Wind size={18} />
              <span className={styles.buttonLabel}>風向・風量</span>
            </button>
          </ControlGroup>

          {/* グループ4: 通信 */}
          <ControlGroup
            id="network"
            icon={<Signal size={18} />}
            label="通信"
            tooltip="電波・通信ネットワーク環境"
            defaultExpanded={false}
            groupToggle={true}
            groupEnabled={
              layerVisibility.showRadioZones ||
              layerVisibility.showNetworkCoverage
            }
            indeterminate={
              (() => {
                const layers = [
                  layerVisibility.showRadioZones,
                  layerVisibility.showNetworkCoverage
                ]
                const anyEnabled = layers.some(v => v)
                const allEnabled = layers.every(v => v)
                return anyEnabled && !allEnabled
              })()
            }
            onGroupToggle={(enabled) => {
              toggleGroupLayers([
                'showRadioZones',
                'showNetworkCoverage'
              ], enabled)
            }}
            favoritable={true}
            isFavorite={favoriteGroups.has('network')}
            onFavoriteToggle={() => toggleFavoriteGroup('network')}
          >
            <button
              className={`${styles.toggleButton} ${layerVisibility.showRadioZones ? styles.activeRadioZones : ''}`}
              onClick={() => toggleLayer('showRadioZones')}
              data-tooltip="電波利用に注意が必要な区域"
              data-tooltip-pos="left"
            >
              <Wifi size={18} />
              <span className={styles.buttonLabel}>電波干渉</span>
            </button>
            <button
              className={`${styles.toggleButton} ${layerVisibility.showNetworkCoverage ? styles.activeNetworkCoverage : ''}`}
              onClick={() => toggleLayer('showNetworkCoverage')}
              data-tooltip="LTE/5G通信可能エリア [L]"
              data-tooltip-pos="left"
            >
              <Signal size={18} />
              <span className={styles.buttonLabel}>通信</span>
            </button>
          </ControlGroup>

          {/* Map設定 (3D/中心十字/スタイル) はサイドバー「地図操作」に移動済み */}
        </div>
  )
}

export default MapControls
