# Rendering & Lighting System — Документация

Портативная система рендеринга и освещения на основе Bruno Simon Folio 2025.

---

## 📦 Установка

### 1. Скопируй файлы в свой проект

```
your-project/
├── lib/
│   ├── Lighting.js              # Система освещения (солнце, тени)
│   ├── Rendering.js             # Система рендеринга (пост-процессинг)
│   ├── Quality.js               # Менеджер качества (адаптивный FPS)
│   ├── MeshDefaultMaterial.js   # Кастомный материал
│   └── demo.html                # Демо для теста
├── src/
│   └── main.js
└── package.json
```

### 2. Установи зависимости

```bash
npm install three
```

**Для пост-процессинга (опционально):**

```bash
npm install three-postprocessing
```

---

## 🚀 Быстрый старт

### Полный пример

```javascript
import * as THREE from 'three'
import { Lighting } from './lib/Lighting.js'
import { Rendering } from './lib/Rendering.js'
import { Quality } from './lib/Quality.js'
import { MeshDefaultMaterial } from './lib/MeshDefaultMaterial.js'

// Сцена, камера
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.z = 5

// Менеджер качества
const quality = new Quality({ level: 0, auto: true })

// Рендеринг
const canvas = document.querySelector('canvas')
const rendering = new Rendering(scene, camera, canvas, {
    quality: quality.level,
    useBloom: true,
    useDOF: false
})

// Освещение
const lighting = new Lighting(scene, camera, { quality: quality.level })

// Объект с кастомным материалом
const gradientMaterial = MeshDefaultMaterial.createGradient('#ff0000', '#0000ff')
const cube = new THREE.Mesh(new THREE.BoxGeometry(), gradientMaterial)
cube.castShadow = true
cube.receiveShadow = true
scene.add(cube)

// Пол
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({ color: 0x666666 })
)
floor.rotation.x = -Math.PI / 2
floor.receiveShadow = true
scene.add(floor)

// Рендер-цикл
function animate() {
    requestAnimationFrame(animate)
    
    // Обновляем качество (адаптивно)
    rendering.setQuality(quality.level)
    lighting.setQuality(quality.level)
    
    lighting.update()
    rendering.render()
}
animate()

// Авто-переключение качества по FPS
quality.onChange((level) => {
    console.log('Quality changed to:', level)
})
```

---

## 📖 API

### Lighting

#### Конструктор

```javascript
new Lighting(scene, camera, options)
```

| Параметр | Тип | Описание |
|----------|-----|----------|
| `scene` | THREE.Scene | Three.js сцена |
| `camera` | THREE.Camera | Three.js камера |
| `options.quality` | number | 0 = высокое, 1 = производительность |
| `options.useDayCycles` | boolean | Анимация дня/ночи |
| `options.focusPoint` | THREE.Vector3 | Точка фокусировки света |

#### Методы

```javascript
// Обновление (вызывать каждый кадр)
lighting.update(deltaTime)

// Показать/скрыть helpers
lighting.setHelpersVisible(true)

// Установить качество
lighting.setQuality(0) // или 1

// Установить цвет света
lighting.setLightColor('#ffaa00', 5)

// Установить ambient цвет
lighting.setAmbientColor('#4444ff', 2)

// Получить ноды для шейдеров
const nodes = lighting.getShaderNodes()

// Создать ноду теней для TSL материала
const shadowNode = lighting.createShadowNode({ normalWorld, positionWorld })

// Удалить освещение
lighting.dispose()
```

#### Свойства

```javascript
lighting.light              // DirectionalLight
lighting.ambientLight       // AmbientLight
lighting.direction          // Вектор направления света
lighting.color              // Цвет света
lighting.intensity          // Интенсивность
lighting.mapSize            // Размер shadow map (2048 или 512)
lighting.shadowAmplitude    // Область теней
```

---

### Rendering

#### Конструктор

```javascript
new Rendering(scene, camera, canvas, options)
```

| Параметр | Тип | Описание |
|----------|-----|----------|
| `scene` | THREE.Scene | Сцена |
| `camera` | THREE.Camera | Камера |
| `canvas` | HTMLElement | Canvas элемент |
| `options.quality` | number | 0 = высокое, 1 = производительность |
| `options.useBloom` | boolean | Включить Bloom |
| `options.useDOF` | boolean | Включить Depth of Field |

#### Методы

```javascript
// Рендер кадра
rendering.render()

// Установить размер
rendering.setSize(width, height)

// Установить качество
rendering.setQuality(0)

// Настроить Bloom
rendering.setBloom({ strength: 0.5, threshold: 0.1, radius: 0.5 })

// Получить renderer
rendering.getRenderer()

// Очистка
rendering.dispose()
```

---

### Quality

#### Конструктор

```javascript
new Quality(options)
```

| Параметр | Тип | Описание |
|----------|-----|----------|
| `options.level` | number | Начальный уровень (0/1) |
| `options.auto` | boolean | Авто-регулировка по FPS |
| `options.targetFPS` | number | Целевой FPS (по умолчанию 60) |

#### Методы

```javascript
// Установить уровень
quality.set(0)

// Переключить
quality.toggle()

// Получить настройки
const settings = quality.getSettings()

// Получить значение
const shadowSize = quality.get('shadowMapSize')

// Подписаться на изменения
quality.onChange((level) => {
    console.log('Quality:', level)
})

// Получить FPS
const fps = quality.getAverageFPS()
```

---

### MeshDefaultMaterial

#### Создание материала

```javascript
import { MeshDefaultMaterial } from './lib/MeshDefaultMaterial.js'

const material = new MeshDefaultMaterial({
    colorNode: texture(myTexture).rgb,  // Нода цвета
    hasCoreShadows: true,               // Основные тени
    hasDropShadows: false,              // Shadow map тени
    hasLightBounce: true,               // Отражённый свет
    hasFog: true,                       // Туман
    hasWater: false,                    // Эффект воды
    transparent: false                  // Прозрачность
})
```

#### Статические методы

```javascript
// Градиентный материал
const gradientMat = MeshDefaultMaterial.createGradient(
    '#ff0000',  // Цвет A
    '#0000ff',  // Цвет B
    'vertical'  // 'vertical', 'horizontal', 'radial'
)

// Emissive материал
const emissiveMat = MeshDefaultMaterial.createEmissive(
    '#ff8800',  // Цвет
    3           // Интенсивность
)
```

#### Обновление параметров

```javascript
material.update({
    hasCoreShadows: false,
    hasLightBounce: true
})
```

#### Интеграция с Lighting

```javascript
material.setLightingUniforms(lighting)
```

---

## 🎨 Примеры использования

### 1. Простая сцена с кубом

```javascript
import * as THREE from 'three'
import { Lighting } from './lib/Lighting.js'
import { MeshDefaultMaterial } from './lib/MeshDefaultMaterial.js'

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.z = 5

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

// Освещение
const lighting = new Lighting(scene, camera, { quality: 0 })

// Куб с кастомным материалом
const gradientMaterial = MeshDefaultMaterial.createGradient('#ff0000', '#0000ff')
const cube = new THREE.Mesh(new THREE.BoxGeometry(), gradientMaterial)
cube.castShadow = true
cube.receiveShadow = true
scene.add(cube)

// Пол
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({ color: 0x666666 })
)
floor.rotation.x = -Math.PI / 2
floor.receiveShadow = true
scene.add(floor)

// Анимация
function animate() {
    requestAnimationFrame(animate)
    
    cube.rotation.x += 0.01
    cube.rotation.y += 0.01
    
    lighting.update()
    renderer.render(scene, camera)
}
animate()
```

### 2. Сцена с фокусировкой на объекте

```javascript
// Свет следует за объектом
const targetObject = new THREE.Object3D()
scene.add(targetObject)

const lighting = new Lighting(scene, camera, {
    focusPoint: targetObject.position
})

// В рендер-цикле
function animate() {
    // Обновляем позицию объекта
    targetObject.position.x = Math.sin(Date.now() * 0.001) * 5
    
    // Свет автоматически следует за объектом
    lighting.focusPoint.copy(targetObject.position)
    lighting.update()
    
    renderer.render(scene, camera)
}
```

### 3. Интеграция с кастомными материалами

```javascript
import { MeshDefaultMaterial } from './lib/MeshDefaultMaterial.js'

// Создаём материал
const material = new MeshDefaultMaterial({
    colorNode: texture(myTexture).rgb,
    hasCoreShadows: true,
    hasLightBounce: true
})

// Привязываем к освещению
material.setLightingUniforms(lighting)

// Используем
const mesh = new THREE.Mesh(geometry, material)
mesh.castShadow = true
mesh.receiveShadow = true
scene.add(mesh)
```

### 4. Day/Night цикл

```javascript
const lighting = new Lighting(scene, camera, {
    useDayCycles: true,  // Включить автоматический цикл
    quality: 0
})

// В рендер-цикле
function animate() {
    lighting.update()  // Автоматически обновляет позицию солнца
    
    renderer.render(scene, camera)
}
```

---

## 🔧 Настройки производительности

### Высокое качество (quality: 0)

```javascript
const lighting = new Lighting(scene, camera, {
    quality: 0
})

// Shadow map: 2048x2048
// Shadow radius: 3
// Bloom mips: 5
```

### Производительность (quality: 1)

```javascript
const lighting = new Lighting(scene, camera, {
    quality: 1
})

// Shadow map: 512x512
// Shadow radius: 2
// Bloom mips: 2
```

### Динамическое изменение качества

```javascript
// Проверка FPS и переключение качества
if (fps < 30) {
    lighting.setQuality(1)
} else {
    lighting.setQuality(0)
}
```

---

## 🎯 Двухуровневая система теней

### Core Shadows (основные тени)

Дешёвые тени, вычисляемые в шейдере на основе нормали и направления света:

```javascript
// Быстрый расчёт без shadow map
const coreShadowMix = normalWorld
    .dot(lightDirection)
    .smoothstep(coreShadowEdgeHigh, coreShadowEdgeLow)
```

**Плюсы:**
- Нулевая стоимость shadow map
- Мгновенный расчёт
- Подходит для статичных объектов

### Drop Shadows (отбрасываемые тени)

Реальные тени из shadow map:

```javascript
// Включается через материал
const material = new MeshDefaultMaterial({
    hasDropShadows: true  // Использовать shadow map
})
```

**Плюсы:**
- Реалистичные мягкие тени
- Динамические объекты

### Комбинирование

```javascript
const material = new MeshDefaultMaterial({
    hasCoreShadows: true,   // Базовые тени
    hasDropShadows: true    // + реальные тени для важных объектов
})
```

---

## 💡 Fake Light Bounce

Имитация глобального освещения (отражённый свет от поверхности):

```javascript
// Ориентация поверхности (смотрит ли вниз?)
const bounceOrientation = normalWorld
    .dot(vec3(0, -1, 0))
    .smoothstep(lightBounceEdgeLow, lightBounceEdgeHigh)

// Расстояние от земли
const bounceDistance = lightBounceDistance
    .sub(max(0, positionWorld.y))
    .div(lightBounceDistance)
    .max(0)
    .pow(2)

// Смешивание с цветом земли
outputColor = mix(outputColor, bounceColor, bounceOrientation * bounceDistance)
```

**Эффект:** Объекты получают цветовой оттенок от поверхности под ними.

---

## 📝 Changelog

### v1.0.0
- Базовая система освещения
- DirectionalLight с тенями
- Ambient light
- Helpers для отладки
- Адаптивное качество
- Интеграция с MeshDefaultMaterial

---

## 📄 Лицензия

MIT — свободное использование с указанием авторства.

---

## 🔗 Ссылки

- [Three.js документация](https://threejs.org/docs/)
- [Three.js TSL](https://threejs.org/docs/#examples/en/tsl)
- [Оригинальный проект](https://bruno-simon.com/)
