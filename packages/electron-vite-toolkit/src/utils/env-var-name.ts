/**
 * Generates a properly formatted environment variable name for Vite dev server URLs.
 * Replaces dashes with underscores to ensure valid JavaScript identifiers.
 *
 * @param folderName - The window folder name (e.g., 'job-assistant')
 * @returns The formatted environment variable name (e.g., 'VITE_DEV_SERVER_URL_JOB_ASSISTANT')
 */
export function getDevServerEnvVarName(folderName: string): string {
  return `VITE_DEV_SERVER_URL_${folderName.toUpperCase().replace(/-/gu, '_')}`;
}
