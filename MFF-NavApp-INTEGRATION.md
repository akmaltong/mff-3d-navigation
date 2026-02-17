# Интеграция системы освещения из custom-folio в MFF-NavApp

## 📋 Обзор

MFF-NavApp использует **React + Three.js** (@react-three/fiber), в то время как custom-folio использует **Vanilla JS + Three.js WebGPU**.

Эта инструкция описывает перенос системы освещения из custom-folio в MFF-NavApp.

---

## 🔧 Что нужно перенести

### 1. Файлы из custom-folio

Скопируй эти файлы в `MFF-NavApp/src/lib/`:

```
custom-folio/lib/Lighting.js          →  MFF-NavApp/src/lib/LightingSystem.tsx
custom-folio/lib/MeshDefaultMaterial.js →  MFF-NavApp/src/lib/MeshDefaultMaterial.tsx (опционально)
custom-folio/lib/Quality.js           →  MFF-NavApp/src/lib/QualityManager.ts (опционально)
custom-folio/lib/Rendering.js         →  MFF-NavApp/src/lib/RenderingSystem.tsx (опционально)
```

---

## 📦 Установка

### 1. Скопируй файл LightingSystem.tsx

Помести файл `MFF-NavApp-LightingSystem.tsx` в:
```
MFF-NavApp_01/MFF-NavApp/src/lib/LightingSystem.tsx
```

### 2. Обнови appStore.ts

Добавь новые поля в `src/store/appStore.ts`:

```typescript
// Новые настройки освещения (из custom-folio)
sunIntensity: number
setSunIntensity: (intensity: number) => void
ambientIntensity: number
setAmbientIntensity: (intensity: number) => void
autoQuality: boolean
setAutoQuality: (enabled: boolean) => void
```

В секции `persist` добавь:
```typescript
sunIntensity: state.sunIntensity,
ambientIntensity: state.ambientIntensity,
autoQuality: state.autoQuality,
```

### 3. Обнови HDRIEnvironment.tsx

Замени или дополни компонент:

```typescript
import { LightingSystem, FakeLightBounce, CoreShadows } from '../lib/LightingSystem'

// В Scene3D.tsx оберни контент:
<LightingSystem>
  <HDRIEnvironment />
  <VenueModelBaked />
  <FakeLightBounce intensity={0.3} />
  <CoreShadows enabled={true} />
</LightingSystem>
```

---

## 🎨 Настройки освещения

### Основные параметры

| Параметр | Описание | Значение по умолчанию |
|----------|----------|----------------------|
| `sunIntensity` | Интенсивность солнца | 5.0 |
| `ambientIntensity` | Интенсивность фонового света | 2.0 |
| `shadowIntensity` | Интенсивность теней | 0.3 |
| `graphicsQuality` | Качество (high/performance) | high |
| `autoQuality` | Авто-качество по FPS | false |

### Позиция солнца

Солнце автоматически вычисляется на основе:
- `timeOfDay` (0-24 часа)
- `sunOrientation` (0-360 градусов)

---

## 🎮 UI для настроек

### Добавь в SettingsPanel.tsx

```typescript
// Sun Intensity
<div className="setting">
  <label>Sun Intensity</label>
  <input
    type="range"
    min="0"
    max="20"
    step="0.1"
    value={sunIntensity}
    onChange={(e) => setSunIntensity(parseFloat(e.target.value))}
  />
</div>

// Ambient Intensity
<div className="setting">
  <label>Ambient Intensity</label>
  <input
    type="range"
    min="0"
    max="10"
    step="0.1"
    value={ambientIntensity}
    onChange={(e) => setAmbientIntensity(parseFloat(e.target.value))}
  />
</div>

// Auto Quality
<div className="setting">
  <label>
    <input
      type="checkbox"
      checked={autoQuality}
      onChange={(e) => setAutoQuality(e.target.checked)}
    />
    Auto Quality (FPS-based)
  </label>
</div>
```

---

## 📊 Сравнение систем

| Функция | custom-folio | MFF-NavApp | После интеграции |
|---------|--------------|------------|------------------|
| **Рендерер** | WebGPU | WebGL 2 | WebGL 2 |
| **Освещение** | DirectionalLight | HDRI + Ambient | Directional + HDRI |
| **Тени** | Shadow Map (512/2048) | Отключены | Shadow Map (512/2048) |
| **Core Shadows** | ✅ (TSL шейдеры) | ❌ | ⚠️ (через HemisphereLight) |
| **Fake Light Bounce** | ✅ (шейдеры) | ❌ | ✅ (DirectionalLight снизу) |
| **Post-processing** | TSL Bloom, DOF | @react-three/postprocessing | @react-three/postprocessing |
| **Адаптивное качество** | ✅ (FPS мониторинг) | ⚠️ (только high/performance) | ✅ (с авто-FPS) |

---

## 🔍 Отладка

### Визуализация helpers

Раскомментируй в `LightingSystem.tsx`:

```typescript
<LightingHelpers showDirectionHelper={true} showShadowHelper={true} />
```

### Консоль

```typescript
// В LightingSystem.tsx добавь:
useEffect(() => {
  console.log('🔦 Lighting:', {
    sunPos: directionalLightRef.current?.position,
    intensity: directionalLightRef.current?.intensity,
    shadowEnabled: gl.shadowMap.enabled,
    quality: graphicsQuality
  })
}, [timeOfDay, graphicsQuality])
```

---

## ⚠️ Проблемы и решения

### 1. Тени не отображаются

**Решение:**
```typescript
// В VenueModelBaked.tsx включи тени:
child.castShadow = true
child.receiveShadow = true
```

### 2. Низкая производительность

**Решение:**
- Уменьши `shadowMapSize` до 512
- Отключи `FakeLightBounce`
- Включи `autoQuality`

### 3. Слишком тёмная сцена

**Решение:**
- Увеличь `hdriIntensity` до 1.5-2.0
- Увеличь `ambientIntensity` до 3.0
- Проверь `toneMappingExposure` (должен быть 1.0-1.5)

---

## 📝 Changelog

### v1.0.0 - Интеграция
- ✅ LightingSystem компонент
- ✅ FakeLightBounce компонент
- ✅ CoreShadows компонент
- ✅ Интеграция с appStore
- ✅ Настройки UI

---

## 🔗 Ссылки

- [Оригинальный custom-folio](https://github.com/bruno-simon)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [Three.js Shadows](https://threejs.org/docs/#api/en/lights/DirectionalLight.shadow)
