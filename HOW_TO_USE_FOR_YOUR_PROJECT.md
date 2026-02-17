# Как использовать этот проект для своего приложения

## Быстрый старт

### 1. Установка и запуск

```bash
# Установи зависимости
npm install --force

# Запусти dev-сервер
npm run dev

# Открой http://localhost:5173
```

### 2. Структура проекта

```
folio-2025-main/
├── sources/              # Исходный код
│   ├── Game/            # Игровая логика
│   │   ├── Materials.js      # Система материалов ✅
│   │   ├── Lighting.js       # Освещение и тени ✅
│   │   ├── Rendering.js      # Рендеринг ✅
│   │   ├── World/            # Игровой мир
│   │   └── ...
│   ├── index.html       # HTML точка входа
│   └── index.js         # JS точка входа
├── static/              # Статические файлы
│   ├── models/          # 3D модели (.glb)
│   └── textures/        # Текстуры
└── dist/                # Production сборка
```

---

## Сценарии использования

### Сценарий 1: Модификация существующего проекта

**Подходит для:** Быстрого прототипа, похожего на оригинал

1. **Замени 3D-модели:**
   ```bash
   # Положи свои .glb файлы в static/models/
   static/models/my-model.glb
   ```

2. **Обнови загрузку ресурсов:**
   ```javascript
   // sources/Game/ResourcesLoader.js
   this.loader.load([
       { name: 'myModel', source: '/models/my-model.glb' }
   ])
   ```

3. **Измени мир:**
   ```javascript
   // sources/Game/World/World.js
   // Добавь свои объекты
   const myObject = this.game.resources.myModel.scene
   this.game.scene.add(myObject)
   ```

---

### Сценарий 2: Использовать систему материалов и освещения

**Подходит для:** Создания нового проекта с готовой оптимизацией

#### Шаг 1: Скопируй нужные модули

```bash
# Создай новый проект
mkdir my-3d-app
cd my-3d-app
npm init -y
npm install three vite

# Скопируй модули
cp -r folio-2025-main/sources/Game/Materials.js ./src/
cp -r folio-2025-main/sources/Game/Lighting.js ./src/
cp -r folio-2025-main/sources/Game/Materials/ ./src/Materials/
```

#### Шаг 2: Используй в своем проекте

```javascript
// src/main.js
import * as THREE from 'three'
import { Materials } from './Materials.js'
import { Lighting } from './Lighting.js'

// Создай сцену
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight)
const renderer = new THREE.WebGLRenderer()

// Используй готовую систему материалов
const materials = new Materials()
const myMaterial = materials.createGradient('myGradient', '#ff0000', '#0000ff')

// Используй готовую систему освещения
const lighting = new Lighting()

// Создай объект
const geometry = new THREE.BoxGeometry()
const mesh = new THREE.Mesh(geometry, myMaterial)
scene.add(mesh)

// Рендер
function animate() {
    requestAnimationFrame(animate)
    lighting.update()
    renderer.render(scene, camera)
}
animate()
```

---

### Сценарий 3: Создать новый проект с той же архитектурой

**Подходит для:** Полноценного приложения с масштабируемой архитектурой

#### Структура нового проекта:

```
my-app/
├── sources/
│   ├── App/
│   │   ├── App.js              # Главный класс (как Game.js)
│   │   ├── Materials.js        # Скопирован из оригинала
│   │   ├── Lighting.js         # Скопирован из оригинала
│   │   ├── Rendering.js        # Скопирован из оригинала
│   │   ├── MyScene/
│   │   │   ├── MyScene.js      # Твоя сцена
│   │   │   └── MyObjects.js    # Твои объекты
│   │   └── ...
│   ├── index.html
│   └── index.js
├── static/
│   └── models/
├── package.json
└── vite.config.js              # Скопирован из оригинала
```

#### Пример App.js:

```javascript
import * as THREE from 'three/webgpu'
import { Materials } from './Materials.js'
import { Lighting } from './Lighting.js'
import { Rendering } from './Rendering.js'
import { MyScene } from './MyScene/MyScene.js'

export class App {
    static instance = null
    
    static getInstance() {
        if (!App.instance) {
            App.instance = new App()
        }
        return App.instance
    }
    
    constructor() {
        // Singleton
        if (App.instance) {
            return App.instance
        }
        App.instance = this
        
        // Setup
        this.scene = new THREE.Scene()
        this.materials = new Materials()
        this.lighting = new Lighting()
        this.rendering = new Rendering()
        this.myScene = new MyScene()
        
        this.start()
    }
    
    start() {
        this.rendering.start()
    }
}
```

---

## Что можно переиспользовать

### ✅ Готовые системы (копируй как есть):

1. **Materials.js** - Система материалов
   - Процедурные градиенты
   - Emissive материалы
   - Поддержка текстур
   - Кастомные шейдеры

2. **Lighting.js** - Освещение
   - Динамические тени
   - Day/night cycle
   - Адаптивное качество
   - Fake light bounce

3. **Rendering.js** - Рендеринг
   - Post-processing (Bloom, DOF)
   - Адаптивное качество
   - Stats мониторинг

4. **MeshDefaultMaterial.js** - Кастомный материал
   - Двухуровневые тени
   - Селективные эффекты
   - Оптимизированный шейдер

### 🔧 Что нужно адаптировать:

1. **World/** - Игровой мир (специфичен для портфолио)
2. **Player.js** - Управление игроком
3. **Physics/** - Физика (если не нужна)
4. **ResourcesLoader.js** - Загрузка ресурсов (пути к файлам)

---

## Примеры проектов

### 1. Виртуальный шоурум

```javascript
// Используй готовую систему
import { Materials } from './Materials.js'
import { Lighting } from './Lighting.js'

// Загрузи свои модели
const loader = new GLTFLoader()
loader.load('/models/product.glb', (gltf) => {
    const product = gltf.scene
    
    // Примени готовые материалы
    materials.updateObject(product)
    
    scene.add(product)
})

// Готовое освещение с тенями
const lighting = new Lighting()
```

### 2. Интерактивная презентация

```javascript
// Используй готовую архитектуру
class Presentation {
    constructor() {
        this.materials = new Materials()
        this.lighting = new Lighting()
        this.rendering = new Rendering()
        
        this.createSlides()
    }
    
    createSlides() {
        // Создай слайды с готовыми материалами
        const slide1 = this.materials.createEmissiveGradient(
            'slide1',
            '#ff0000',
            '#0000ff',
            2
        )
    }
}
```

### 3. Архитектурная визуализация

```javascript
// Используй систему качества
import { Quality } from './Quality.js'
import { Lighting } from './Lighting.js'

const quality = new Quality()
const lighting = new Lighting()

// Адаптивные тени
lighting.mapSize = quality.level === 0 ? 2048 : 512

// Загрузи здание
loader.load('/models/building.glb', (gltf) => {
    const building = gltf.scene
    
    // Автоматическая оптимизация материалов
    materials.updateObject(building)
    
    scene.add(building)
})
```

---

## Build и Deploy

### Development

```bash
npm run dev
# Открой http://localhost:5173
```

### Production

```bash
npm run build
# Результат в dist/

# Deploy на любой хостинг:
# - Vercel
# - Netlify
# - GitHub Pages
# - AWS S3
```

### Оптимизация ассетов

```bash
# Сжатие текстур и моделей
npm run compress
```

---

## Лицензия и использование

⚠️ **Важно:** Этот проект - портфолио Bruno Simon. Перед коммерческим использованием:

1. Проверь лицензию (license.md)
2. Удали специфичный контент (модели, текстуры, логотипы)
3. Замени на свой контент
4. Укажи авторство, если требуется

**Можно использовать:**
- ✅ Архитектуру кода
- ✅ Систему материалов
- ✅ Систему освещения
- ✅ Техники оптимизации

**Нельзя использовать как есть:**
- ❌ 3D-модели Bruno Simon
- ❌ Текстуры и ассеты
- ❌ Контент портфолио
- ❌ Брендинг

---

## Полезные ссылки

- [Three.js документация](https://threejs.org/docs/)
- [Vite документация](https://vitejs.dev/)
- [WebGPU](https://gpuweb.github.io/gpuweb/)
- [Оригинальный проект](https://bruno-simon.com/)

---

## Поддержка

Если нужна помощь:
1. Изучи код в `sources/Game/`
2. Посмотри примеры в `sources/Game/World/`
3. Проверь `OPTIMIZATION_ANALYSIS.md` для понимания техник

Удачи в создании своего проекта! 🚀
