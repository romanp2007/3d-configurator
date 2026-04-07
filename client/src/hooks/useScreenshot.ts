/**
 * Хук для создания скриншота 3D-сцены и скачивания PNG
 *
 * Использование:
 *   const { screenshotRef, takeScreenshot, getDataUrl } = useScreenshot();
 *   // screenshotRef передаётся в <SceneView ref={screenshotRef} />
 */

import { useRef, useCallback } from 'react';

export interface ScreenshotHandle {
  /** Вернуть dataURL (base64 PNG) текущего кадра */
  getDataUrl: () => string | null;
}

/**
 * Скачать файл по dataURL
 */
function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

export function useScreenshot() {
  const screenshotRef = useRef<ScreenshotHandle>(null);

  /** Сделать скриншот и скачать PNG */
  const takeScreenshot = useCallback(() => {
    const dataUrl = screenshotRef.current?.getDataUrl();
    if (!dataUrl) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    downloadDataUrl(dataUrl, `scene-${timestamp}.png`);
  }, []);

  /** Получить dataURL для thumbnail (не скачивать) */
  const getThumbnail = useCallback((): string | null => {
    return screenshotRef.current?.getDataUrl() ?? null;
  }, []);

  return { screenshotRef, takeScreenshot, getThumbnail };
}
