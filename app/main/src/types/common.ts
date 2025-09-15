/**
 * Defines the configuration for a single renderable window.
 */
export interface WindowConfig {
  renderer: { path: string } | URL;
  preload: { path: string };
}
