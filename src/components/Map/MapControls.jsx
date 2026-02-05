/**
 * MapControls Component
 *
 * 地図レイヤーコントロールパネル
 */

import { Layers, Users, ShieldAlert, Plane, CloudRain, Signal, Settings2, Building2, Zap, Building, Shield, Lock, Target, Landmark, AlertTriangle, Radio, MapPinned, Map as MapIcon, Wind, Wifi, Box, Rotate3D, Crosshair, Satellite } from 'lucide-react'
import ControlGroup from './ControlGroup'
import { CROSSHAIR_DESIGNS, CROSSHAIR_COLORS, COORDINATE_FORMATS, MAP_STYLES } from './mapConstants'
import styles from './Map.module.scss'

const MapControls = ({
  layerVisibility,
  setLayerVisibility,
  toggleLayer,
  toggleAirportOverlay,
  toggleGroupLayers,
  toggle3D,
  favoriteGroups,
  toggleFavoriteGroup,
  showCrosshair,
  setShowCrosshair,
  crosshairDesign,
  setCrosshairDesign,
  crosshairColor,
  setCrosshairColor,
  crosshairClickMode,
  setCrosshairClickMode,
  coordinateFormat,
  setCoordinateFormat,
  mapStyleId,
  setMapStyleId,
  isMobile,
  mobileControlsExpanded,
  showStylePicker,
  setShowStylePicker
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
              data-tooltip="電波利用に注意が必要な区域 [T]"
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

          {/* グループ5: Map設定 */}
          <ControlGroup
            id="map-settings"
            icon={<Settings2 size={18} />}
            label="Map設定"
            tooltip="地図表示の各種設定"
            defaultExpanded={false}
            favoritable={true}
            isFavorite={favoriteGroups.has('map-settings')}
            onFavoriteToggle={() => toggleFavoriteGroup('map-settings')}
          >
            <button
              className={`${styles.toggleButton} ${layerVisibility.is3D ? styles.active : ''}`}
              onClick={toggle3D}
              data-tooltip={layerVisibility.is3D ? '地形を平面で表示 [3]' : '地形を立体で表示 [3]'}
              data-tooltip-pos="left"
            >
              {layerVisibility.is3D ? <Box size={18} /> : <Rotate3D size={18} />}
              <span className={styles.buttonLabel}>{layerVisibility.is3D ? '2D' : '3D'}</span>
            </button>
            {/* クロスヘア設定 */}
            <ControlGroup
              id="crosshair"
              icon={<Crosshair size={18} />}
              label="中心十字"
              tooltip="地図中心の十字線を表示 [X]"
              groupToggle={true}
              groupEnabled={showCrosshair}
              onGroupToggle={setShowCrosshair}
              defaultExpanded={false}
            >
              <div className={styles.crosshairSettings}>
                <div className={styles.crosshairRow}>
                  <span className={styles.crosshairLabel}>表示</span>
                  <select
                    className={styles.crosshairSelect}
                    value={crosshairDesign}
                    onChange={(e) => setCrosshairDesign(e.target.value)}
                  >
                    {CROSSHAIR_DESIGNS.map(d => (
                      <option key={d.id} value={d.id}>{d.icon} {d.label}</option>
                    ))}
                  </select>
                  <select
                    className={styles.crosshairColorSelect}
                    value={crosshairColor}
                    onChange={(e) => setCrosshairColor(e.target.value)}
                    style={{ '--selected-color': crosshairColor }}
                  >
                    {CROSSHAIR_COLORS.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.crosshairRow}>
                  <label className={styles.crosshairCheckbox}>
                    <input
                      type="checkbox"
                      checked={crosshairClickMode}
                      onChange={(e) => setCrosshairClickMode(e.target.checked)}
                    />
                    <span>クリックで座標</span>
                  </label>
                  <select
                    className={styles.crosshairSelect}
                    value={coordinateFormat}
                    onChange={(e) => setCoordinateFormat(e.target.value)}
                    disabled={!crosshairClickMode}
                  >
                    {COORDINATE_FORMATS.map(f => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </ControlGroup>

            {/* 地図スタイル切り替え */}
            <div className={styles.stylePickerContainer}>
              <button
                className={`${styles.toggleButton} ${showStylePicker ? styles.active : ''}`}
                onClick={() => setShowStylePicker(!showStylePicker)}
                data-tooltip="地図の表示スタイルを切り替え [M: 次へ / Shift+M: 前へ]"
                data-tooltip-pos="left"
              >
                <Layers size={18} />
                <span className={styles.buttonLabel}>スタイル</span>
              </button>
              {showStylePicker && (
                <div className={styles.stylePicker}>
                  {Object.values(MAP_STYLES).map(styleOption => (
                    <button
                      key={styleOption.id}
                      className={`${styles.styleOption} ${mapStyleId === styleOption.id ? styles.activeStyle : ''}`}
                      onClick={() => {
                        setMapStyleId(styleOption.id)
                        setShowStylePicker(false)
                      }}
                    >
                      <span className={styles.styleIcon}>
                        {styleOption.id === 'gsi_photo' ? <Satellite size={16} /> : <MapIcon size={16} />}
                      </span>
                      <span className={styles.styleName}>{styleOption.shortName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </ControlGroup>
        </div>
  )
}

export default MapControls
