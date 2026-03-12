import { useState } from 'react'
import { useAppStore } from '../store/appStore'
import { settingsPanelStyle } from '../styles/panelStyles'
import ZoneMappingEditor from './ZoneMappingEditor'

type SettingsTab = 'lighting' | 'material' | 'effects' | 'editor' | 'zones'

export default function SettingsPanel() {
  const store = useAppStore()
  const setActiveBottomPanel = useAppStore(state => state.setActiveBottomPanel)
  const setEditMode = useAppStore(state => state.setEditMode)
  const setPoiEditMode = useAppStore(state => state.setPoiEditMode)
  const [activeTab, setActiveTab] = useState<SettingsTab>('lighting')

  const resetAll = () => {
    store.setToneMappingExposure(1.0)
    store.setToneMapping('ACES')
    store.setMaterialColor('#d4d4d4')
    store.setMaterialRoughness(0.7)
    store.setMaterialMetalness(0.05)
    store.setBloomIntensity(0.5)
    store.setBloomThreshold(0.9)
    store.setVignetteIntensity(0.35)
    store.setDofEnabled(false)
    store.setChromaticAberration(0.002)
    store.setColorBrightness(0.0)
    store.setColorContrast(0.05)
    store.setColorSaturation(0.1)
    store.setNightLightsEnabled(true)
    store.setContactShadowsEnabled(true)
    store.setSunIntensity(5.0)
    store.setAmbientIntensity(2.0)
  }

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'lighting',
      label: 'Освещение',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ),
    },
    {
      id: 'material',
      label: 'Материал',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      ),
    },
    {
      id: 'effects',
      label: 'Эффекты',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
    },
    {
      id: 'editor',
      label: 'Редактор',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      ),
    },
    {
      id: 'zones',
      label: 'Зоны',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      ),
    },
  ]

  return (
    <div
      className="absolute bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-[60] pointer-events-auto select-none w-[95%] sm:w-auto max-w-[900px] shadow-2xl m-2"
      style={{ 
        backgroundColor: 'rgba(40, 40, 40, 0.4)',
        backdropFilter: 'blur(12px) saturate(180%) brightness(0.7)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%) brightness(0.7)',
        borderRadius: '25px',
        border: '1px solid rgba(255,255,255,0.15)',
        boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.1), inset 0 -1px 0 0 rgba(0,0,0,0.2), 0 8px 32px rgba(0,0,0,0.4)',
        padding: '12px 16px',
      }}
    >
      <style>{`
        @keyframes slideUpIn {
          from { opacity: 0; transform: translate(-50%, 30px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .settings-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 10px;
          outline: none;
          background: linear-gradient(to right, rgba(255,200,120,0.15), rgba(255,200,120,0.35) 50%, rgba(255,200,120,0.15));
        }
        .settings-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #fff, #e0d8c8);
          border: 2px solid rgba(255,255,255,0.8);
          box-shadow: 0 2px 8px rgba(0,0,0,0.4), 0 0 0 2px rgba(255,200,120,0.2);
          cursor: pointer;
          transition: transform 0.15s;
        }
        .settings-slider::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        .settings-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #fff, #e0d8c8);
          border: 2px solid rgba(255,255,255,0.8);
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          cursor: pointer;
        }
      `}</style>

      {/* Main panel */}
      <div
        style={{
          maxWidth: '700px',
          maxHeight: '400px',
          overflowY: 'auto' as const,
          position: 'relative' as const,
        }}
      >
        {/* Tab buttons */}
        <div className="flex items-center gap-1 sm:gap-2 mb-3 sm:mb-4 flex-wrap">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="transition-all duration-200 text-[9px] sm:text-[11px]"
              style={{
                padding: '4px 10px',
                borderRadius: '10px',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase' as const,
                color: 'white',
                background: activeTab === tab.id ? 'rgba(255,200,120,0.2)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${activeTab === tab.id ? 'rgba(255,200,120,0.3)' : 'rgba(255,255,255,0.1)'}`,
                cursor: 'pointer',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="hidden sm:inline">{tab.icon}</span>
                {tab.label}
              </span>
            </button>
          ))}

          {/* Reset button */}
          <button
            onClick={resetAll}
            className="transition-all duration-200 ml-auto text-[9px] sm:text-[10px]"
            style={{
              padding: '4px 10px',
              borderRadius: '10px',
              fontWeight: 500,
              letterSpacing: '0.05em',
              textTransform: 'uppercase' as const,
              color: 'rgba(255,255,255,0.5)',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,100,100,0.15)'
              e.currentTarget.style.color = 'rgba(255,180,180,0.9)'
              e.currentTarget.style.borderColor = 'rgba(255,100,100,0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
              e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
            }}
          >
            Сброс
          </button>
        </div>

        {/* LIGHTING TAB */}
        {activeTab === 'lighting' && (
          <div className="flex items-start gap-6">
            {/* Left column - Sun and Ambient */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px', textTransform: 'uppercase' as const, marginBottom: '10px' }}>
                Основные источники света
              </div>
              <SettingsSlider 
                label="☀️ Солнце (интенсивность)" 
                value={store.sunIntensity} 
                min={0} 
                max={20} 
                step={0.1} 
                onChange={store.setSunIntensity} 
              />
              <SettingsSlider 
                label="💡 Фоновый свет" 
                value={store.ambientIntensity} 
                min={0} 
                max={10} 
                step={0.1} 
                onChange={store.setAmbientIntensity} 
              />
              <SettingsSlider 
                label="🌑 Тени" 
                value={store.shadowIntensity} 
                min={0} 
                max={1} 
                step={0.05} 
                onChange={store.setShadowIntensity} 
              />
              
              {/* Auto Quality Toggle */}
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px', textTransform: 'uppercase' as const, marginBottom: '10px' }}>
                  Качество
                </div>
                <SettingsToggle 
                  label="⚡ Авто качество (FPS)" 
                  value={store.autoQuality} 
                  onChange={store.setAutoQuality} 
                />
                <SettingsToggle 
                  label="📊 Качество: " + (store.graphicsQuality === 'high' ? 'Высокое' : 'Производительность')
                  value={store.graphicsQuality === 'high'} 
                  onChange={(v) => store.setGraphicsQuality(v ? 'high' : 'performance')} 
                />
              </div>
            </div>

            {/* Right column - Time and Presets */}
            <div style={{ width: '200px', flexShrink: 0 }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px', textTransform: 'uppercase' as const, marginBottom: '10px' }}>
                Время суток
              </div>
              <SettingsSlider 
                label="🕐 Время" 
                value={store.timeOfDay} 
                min={0} 
                max={24} 
                step={0.5} 
                onChange={store.setTimeOfDay} 
              />
              <SettingsSlider 
                label="🧭 Ориентация" 
                value={store.sunOrientation} 
                min={0} 
                max={360} 
                step={15} 
                onChange={store.setSunOrientation} 
              />
              
              {/* Lighting Presets */}
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px', textTransform: 'uppercase' as const, marginBottom: '10px' }}>
                  Пресеты
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button
                    onClick={() => {
                      store.setSunIntensity(5.0)
                      store.setAmbientIntensity(2.0)
                      store.setTimeOfDay(14)
                      store.setSunOrientation(180)
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '10px',
                      fontWeight: 500,
                      color: 'white',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                      transition: '0.2s',
                      textAlign: 'left' as const,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  >
                    ☀️ День
                  </button>
                  
                  <button
                    onClick={() => {
                      store.setSunIntensity(2.0)
                      store.setAmbientIntensity(1.0)
                      store.setTimeOfDay(18)
                      store.setSunOrientation(270)
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '10px',
                      fontWeight: 500,
                      color: 'white',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                      transition: '0.2s',
                      textAlign: 'left' as const,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  >
                    🌅 Закат
                  </button>
                  
                  <button
                    onClick={() => {
                      store.setSunIntensity(0.5)
                      store.setAmbientIntensity(0.5)
                      store.setTimeOfDay(0)
                      store.setSunOrientation(0)
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '10px',
                      fontWeight: 500,
                      color: 'white',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                      transition: '0.2s',
                      textAlign: 'left' as const,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  >
                    🌙 Ночь
                  </button>
                  
                  <button
                    onClick={() => {
                      store.setSunIntensity(8.0)
                      store.setAmbientIntensity(3.0)
                      store.setTimeOfDay(12)
                      store.setSunOrientation(180)
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '10px',
                      fontWeight: 500,
                      color: 'white',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                      transition: '0.2s',
                      textAlign: 'left' as const,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  >
                    ✨ Ярко
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MATERIAL TAB */}
        {activeTab === 'material' && (
          <div style={{ display: 'flex', gap: '20px' }}>
            {/* Left column - Color and sliders */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px', textTransform: 'uppercase' as const, marginBottom: '10px' }}>
                Цвет и свойства материала
              </div>
              
              {/* Color picker row */}
              <div className="flex items-center gap-4 mb-4" style={{ paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ fontSize: '10px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', minWidth: '80px' }}>
                  Цвет модели
                </span>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl border border-white/20"
                    style={{ backgroundColor: store.materialColor, boxShadow: 'inset 0 0 4px rgba(0,0,0,0.3)' }}
                  />
                  <input
                    type="color"
                    value={store.materialColor}
                    onChange={(e) => store.setMaterialColor(e.target.value)}
                    className="w-16 h-8 rounded-lg cursor-pointer bg-transparent border-none"
                    style={{ WebkitAppearance: 'none' }}
                  />
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
                    {store.materialColor}
                  </div>
                </div>
              </div>

              {/* Sliders */}
              <SettingsSlider label="Шероховатость" value={store.materialRoughness} min={0} max={1} step={0.01} onChange={store.setMaterialRoughness} />
              <SettingsSlider label="Металличность" value={store.materialMetalness} min={0} max={1} step={0.01} onChange={store.setMaterialMetalness} />
            </div>

            {/* Right column - Material presets */}
            <div style={{ width: '180px', flexShrink: 0 }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px', textTransform: 'uppercase' as const, marginBottom: '10px' }}>
                Пресеты
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {/* Preset buttons */}
                <button
                  onClick={() => {
                    store.setMaterialColor('#bcbcbc')
                    store.setMaterialRoughness(0.25)
                    store.setMaterialMetalness(0.02)
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '10px',
                    fontWeight: 500,
                    color: 'white',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    transition: '0.2s',
                    textAlign: 'left' as const,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                >
                  🏢 Бетон
                </button>
                
                <button
                  onClick={() => {
                    store.setMaterialColor('#c0c0c0')
                    store.setMaterialRoughness(0.1)
                    store.setMaterialMetalness(0.9)
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '10px',
                    fontWeight: 500,
                    color: 'white',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    transition: '0.2s',
                    textAlign: 'left' as const,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                >
                  ✨ Металл
                </button>
                
                <button
                  onClick={() => {
                    store.setMaterialColor('#8b7355')
                    store.setMaterialRoughness(0.8)
                    store.setMaterialMetalness(0.0)
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '10px',
                    fontWeight: 500,
                    color: 'white',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    transition: '0.2s',
                    textAlign: 'left' as const,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                >
                  🪵 Дерево
                </button>
                
                <button
                  onClick={() => {
                    store.setMaterialColor('#ffffff')
                    store.setMaterialRoughness(0.4)
                    store.setMaterialMetalness(0.0)
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '10px',
                    fontWeight: 500,
                    color: 'white',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    transition: '0.2s',
                    textAlign: 'left' as const,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                >
                  🎨 Пластик
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EFFECTS TAB */}
        {activeTab === 'effects' && (
          <div className="flex items-start gap-6">
            {/* Post-processing */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px', textTransform: 'uppercase' as const, marginBottom: '10px' }}>
                Постобработка
              </div>
              <SettingsSlider label="Bloom" value={store.bloomIntensity} min={0} max={2} step={0.05} onChange={store.setBloomIntensity} />
              <SettingsSlider label="Bloom порог" value={store.bloomThreshold} min={0} max={2} step={0.05} onChange={store.setBloomThreshold} />
              <SettingsSlider label="Виньетка" value={store.vignetteIntensity} min={0} max={0.5} step={0.01} onChange={store.setVignetteIntensity} />
            </div>

            {/* Color correction and UI */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px', textTransform: 'uppercase' as const, marginBottom: '10px' }}>
                Коррекция цвета
              </div>
              <SettingsSlider label="Яркость" value={store.colorBrightness} min={0} max={0.3} step={0.01} onChange={store.setColorBrightness} />
              <SettingsSlider label="Контраст" value={store.colorContrast} min={0} max={0.3} step={0.01} onChange={store.setColorContrast} />
              <SettingsSlider label="Насыщенность" value={store.colorSaturation} min={0} max={0.3} step={0.01} onChange={store.setColorSaturation} />
              
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px', textTransform: 'uppercase' as const, marginBottom: '10px' }}>
                  Интерфейс
                </div>
                <SettingsToggle label="Показать FPS" value={store.showFPS} onChange={store.toggleFPS} />
              </div>
            </div>
          </div>
        )}

        {/* EDITOR TAB */}
        {activeTab === 'editor' && (
          <div className="flex flex-col gap-4">
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px', textTransform: 'uppercase' as const, marginBottom: '4px' }}>
              Редактор зон и точек обзора
            </div>

            <div className="flex gap-3">
              {/* Position Editor */}
              <button
                onClick={() => {
                  setEditMode(true)
                  setPoiEditMode(false)
                  setActiveBottomPanel(null)
                }}
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  borderRadius: '14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'white',
                  background: 'linear-gradient(145deg, rgba(147,51,234,0.3) 0%, rgba(147,51,234,0.15) 100%)',
                  border: '1px solid rgba(147,51,234,0.4)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left' as const,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(147,51,234,0.7)'
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(147,51,234,0.3)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(147,51,234,0.4)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>Редактор позиций</span>
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                  Перемещение зон на карте
                </div>
              </button>

              {/* POI Camera Editor */}
              <button
                onClick={() => {
                  setEditMode(false)
                  setPoiEditMode(true)
                  setActiveBottomPanel(null)
                }}
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  borderRadius: '14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'white',
                  background: 'linear-gradient(145deg, rgba(234,88,12,0.3) 0%, rgba(234,88,12,0.15) 100%)',
                  border: '1px solid rgba(234,88,12,0.4)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left' as const,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(234,88,12,0.7)'
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(234,88,12,0.3)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(234,88,12,0.4)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span>Режим POI</span>
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                  Настройка камер и точек обзора
                </div>
              </button>
            </div>

            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', lineHeight: 1.5, marginTop: '4px' }}>
              Откроется панель редактирования справа. Выберите зону и настройте позицию или камеру. Сохраните результат через 💾.
            </div>
          </div>
        )}

        {activeTab === 'zones' && (
          <div style={{ marginTop: '12px' }}>
            <ZoneMappingEditor />
          </div>
        )}
      </div>
    </div>
  )
}

function SettingsSlider({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void
}) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div className="flex justify-between items-center mb-2">
        <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px', textTransform: 'uppercase' as const }}>
          {label}
        </span>
        <span style={{ fontSize: '10px', color: 'rgba(255,200,120,0.5)', fontFamily: 'monospace' }}>
          {value.toFixed(step < 0.01 ? 4 : 2)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="settings-slider"
      />
    </div>
  )
}

function SettingsToggle({ label, value, onChange }: {
  label: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span style={{ fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>
        {label}
      </span>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: '36px',
          height: '20px',
          borderRadius: '10px',
          background: value ? 'rgba(255,200,120,0.4)' : 'rgba(255,255,255,0.1)',
          border: `1px solid ${value ? 'rgba(255,200,120,0.5)' : 'rgba(255,255,255,0.15)'}`,
          position: 'relative',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <div style={{
          position: 'absolute',
          top: '3px',
          left: value ? '18px' : '3px',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: value ? 'radial-gradient(circle at 30% 30%, #fff, #f0d898)' : '#888',
          transition: 'all 0.2s',
          boxShadow: value ? '0 1px 4px rgba(255,200,120,0.3)' : 'none',
        }} />
      </button>
    </div>
  )
}
