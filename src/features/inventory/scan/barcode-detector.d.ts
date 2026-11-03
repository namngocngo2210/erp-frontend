/**
 * Minimal ambient types for the native BarcodeDetector API.
 * Note: intentionally NOT added to Window interface —
 * the component accesses it via `"BarcodeDetector" in window` guard.
 */
interface BarcodeDetectorResult {
  rawValue: string;
  format: string;
}

interface BarcodeDetector {
  detect(
    image: HTMLVideoElement | HTMLImageElement | ImageBitmap,
  ): Promise<BarcodeDetectorResult[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetector;
}

declare const BarcodeDetector: BarcodeDetectorConstructor;
