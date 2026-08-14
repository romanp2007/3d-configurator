/// <reference types="vite/client" />

// Ambient-декларация для .wgsl-импортов из @wgpu/* (wgpu_utils/src) —
// дублирует src/wgsl.d.ts из wgpu_utils, т.к. tsconfig.json этого пакета
// не включает файлы за пределами своего include: ["src"]. См.
// wiki/plans/3d_configurator_integration.md, Этап 8.
declare module '*.wgsl' {
  const value: string;
  export default value;
}
