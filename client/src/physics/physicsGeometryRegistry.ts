/**
 * Реестр живых THREE.BufferGeometry для physicsMesh-объектов, ключ — id
 * SceneObjectData. Заполняется PhysicsMeshObject (SceneObject.tsx) при
 * монтировании/размонтировании меша, читается PhysicsSimController.tsx
 * каждый физический кадр, чтобы писать результат симуляции напрямую в
 * position-атрибут — БЕЗ похода через Zustand/React re-render (иначе zundo
 * пишет снапшот истории на каждый кадр, см. wiki/plans/
 * 3d_configurator_integration.md, Этап 7).
 *
 * Не Zustand-стор специально: геометрия — мутабельный Three.js-объект,
 * регистрация/чтение не должны триггерить re-render подписчиков.
 */

import type { BufferGeometry } from 'three';

const registry = new Map<string, BufferGeometry>();

export function registerPhysicsGeometry(id: string, geometry: BufferGeometry): void {
  registry.set(id, geometry);
}

export function unregisterPhysicsGeometry(id: string, geometry: BufferGeometry): void {
  // Не удаляем чужую регистрацию, если геометрия уже была пересоздана/заменена
  // под тем же id между register/unregister (React StrictMode двойной mount).
  if (registry.get(id) === geometry) registry.delete(id);
}

export function getPhysicsGeometry(id: string): BufferGeometry | undefined {
  return registry.get(id);
}
