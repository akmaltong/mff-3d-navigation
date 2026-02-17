/**
 * Lighting System для MFF-NavApp
 * Основано на системе освещения из Bruno Simon Folio 2025
 * 
 * Добавляет:
 * - DirectionalLight с динамическими тенями
 * - Core Shadows (дёшевые тени в шейдере)
 * - Fake Light Bounce (имитация глобального освещения)
 * - Адаптивное качество теней
 */

import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore } from '../store/appStore'

interface LightingSystemProps {
  children?: React.ReactNode
}

/**
 * Основной компонент системы освещения
 */
export function LightingSystem({ children }: LightingSystemProps) {
  const { scene, camera, gl } = useThree()
  
  // Настройки из store
  const lightingMode = useAppStore(state => state.lightingMode)
  const graphicsQuality = useAppStore(state => state.graphicsQuality)
  const timeOfDay = useAppStore(state => state.timeOfDay)
  const sunOrientation = useAppStore(state => state.sunOrientation)
  const hdriIntensity = useAppStore(state => state.hdriIntensity)
  const shadowIntensity = useAppStore(state => state.shadowIntensity)
  const toneMappingExposure = useAppStore(state => state.toneMappingExposure)
  
  // Рефы для света
  const directionalLightRef = useRef<THREE.DirectionalLight>(null)
  const ambientLightRef = useRef<THREE.AmbientLight>(null)
  
  // Параметры освещения
  const isHighQuality = graphicsQuality === 'high'
  const shadowMapSize = isHighQuality ? 2048 : 512
  const shadowRadius = isHighQuality ? 3 : 2
  
  // Вычисление позиции солнца на основе времени суток
  const calculateSunPosition = () => {
    // Конвертируем время (0-24) в угол (0-360)
    const hourAngle = (timeOfDay / 24) * Math.PI * 2
    const orientationRad = (sunOrientation * Math.PI) / 180
    
    // Высота солнца зависит от времени дня
    // Полдень (12:00) - солнце в зените, полночь - внизу
    const elevation = Math.sin(hourAngle - Math.PI / 2) * 0.8 + 0.2
    
    // Сферические координаты
    const phi = Math.acos(elevation) // Угол от вертикали
    const theta = orientationRad
    
    const radius = 50
    const x = radius * Math.sin(phi) * Math.sin(theta)
    const y = radius * Math.cos(phi)
    const z = radius * Math.sin(phi) * Math.cos(theta)
    
    return { x, y, z }
  }
  
  // Обновление параметров света
  useEffect(() => {
    if (!directionalLightRef.current || !ambientLightRef.current) return
    
    const sunPos = calculateSunPosition()
    
    // Directional Light
    directionalLightRef.current.position.set(sunPos.x, sunPos.y, sunPos.z)
    directionalLightRef.current.intensity = hdriIntensity * shadowIntensity
    directionalLightRef.current.castShadow = lightingMode === 'sky'
    
    // Настройка теней
    if (directionalLightRef.current.shadow) {
      directionalLightRef.current.shadow.mapSize.set(shadowMapSize, shadowMapSize)
      directionalLightRef.current.shadow.radius = shadowRadius
      directionalLightRef.current.shadow.camera.near = 1
      directionalLightRef.current.shadow.camera.far = 100
      directionalLightRef.current.shadow.camera.left = -50
      directionalLightRef.current.shadow.camera.right = 50
      directionalLightRef.current.shadow.camera.top = 50
      directionalLightRef.current.shadow.camera.bottom = -50
      directionalLightRef.current.shadow.bias = -0.001
      directionalLightRef.current.shadow.normalBias = 0.1
    }
    
    // Ambient Light
    ambientLightRef.current.intensity = hdriIntensity * 0.5
    
    // Тени включаем только в режиме sky
    gl.shadowMap.enabled = lightingMode === 'sky'
    
  }, [
    timeOfDay,
    sunOrientation,
    hdriIntensity,
    shadowIntensity,
    lightingMode,
    graphicsQuality,
    shadowMapSize,
    shadowRadius,
    gl
  ])
  
  // Обновление exposure при изменении
  useEffect(() => {
    gl.toneMappingExposure = toneMappingExposure
  }, [gl, toneMappingExposure])
  
  return (
    <>
      {/* Directional Light (солнце) */}
      <directionalLight
        ref={directionalLightRef}
        castShadow
        position={[10, 20, 10]}
        intensity={1}
        color="#ffffff"
      >
        <orthographicCamera attach="shadow-camera" args={[-50, 50, 50, -50]} />
      </directionalLight>
      
      {/* Ambient Light (фоновое освещение) */}
      <ambientLight
        ref={ambientLightRef}
        intensity={0.5}
        color="#ffffff"
      />
      
      {/* Helper для отладки (раскомментировать для визуализации) */}
      {/* lightingMode === 'sky' && directionalLightRef.current && (
        <directionalLightHelper
          args={[directionalLightRef.current, 5]}
        />
      )} */}
      
      {/* CameraHelper для визуализации области теней */}
      {/* lightingMode === 'sky' && directionalLightRef.current && (
        <primitive
          object={new THREE.CameraHelper(directionalLightRef.current.shadow.camera)}
          visible={false}
        />
      )} */}
      
      {children}
    </>
  )
}

/**
 * Компонент для fake light bounce (имитация отражённого света)
 * Добавляет цветовой оттенок от поверхности
 */
export function FakeLightBounce({
  intensity = 0.3,
  color = '#82487f',
  distance = 1.5
}: {
  intensity?: number
  color?: string
  distance?: number
}) {
  const { scene } = useThree()
  
  useEffect(() => {
    // В Three.js это можно реализовать через кастомные шейдеры
    // или через дополнительный свет снизу
    const bounceLight = new THREE.DirectionalLight(color, intensity * 0.1)
    bounceLight.position.set(0, -10, 0)
    bounceLight.target.position.set(0, 0, 0)
    
    scene.add(bounceLight)
    scene.add(bounceLight.target)
    
    return () => {
      scene.remove(bounceLight)
      scene.remove(bounceLight.target)
      bounceLight.dispose()
    }
  }, [scene, intensity, color, distance])
  
  return null
}

/**
 * Компонент для core shadows (дёшевые тени без shadow map)
 * Использует упрощённый расчёт на основе нормалей
 */
export function CoreShadows({
  enabled = true,
  intensity = 0.5
}: {
  enabled?: boolean
  intensity?: number
}) {
  const { scene } = useThree()
  
  useEffect(() => {
    if (!enabled) return
    
    // Core shadows реализуются через кастомные материалы
    // или через additional ambient occlusion
    // В React Three Fiber это можно сделать через shader materials
    
    // Для упрощения используем HemisphereLight для имитации
    const hemisphereLight = new THREE.HemisphereLight(
      0xffffff, // sky color
      0x444444, // ground color
      intensity * 0.3
    )
    hemisphereLight.position.set(0, 50, 0)
    
    scene.add(hemisphereLight)
    
    return () => {
      scene.remove(hemisphereLight)
    }
  }, [scene, enabled, intensity])
  
  return null
}

/**
 * Компонент для визуализации helpers (отладка)
 */
export function LightingHelpers({
  showDirectionHelper = false,
  showShadowHelper = false
}: {
  showDirectionHelper?: boolean
  showShadowHelper?: boolean
}) {
  const { scene } = useThree()
  const directionalLightRef = useRef<THREE.DirectionalLight>(null)
  
  useEffect(() => {
    if (!directionalLightRef.current) return
    
    // Direction helper
    if (showDirectionHelper) {
      const directionHelper = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.5, 1),
        new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true })
      )
      directionHelper.position.copy(directionalLightRef.current.position)
      scene.add(directionHelper)
      
      return () => {
        scene.remove(directionHelper)
        directionHelper.geometry.dispose()
        directionHelper.material.dispose()
      }
    }
  }, [scene, showDirectionHelper])
  
  return (
    <>
      {showShadowHelper && directionalLightRef.current && (
        <primitive
          object={new THREE.CameraHelper(directionalLightRef.current.shadow.camera)}
          visible={showShadowHelper}
        />
      )}
    </>
  )
}

export default LightingSystem
