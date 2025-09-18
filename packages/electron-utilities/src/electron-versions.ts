import { execSync } from 'node:child_process';
import { env } from 'node:process';

function getElectronEnv() {
  return JSON.parse(
    execSync(`npx electron -p "JSON.stringify(process.versions)"`, {
      encoding: 'utf-8',
      env: {
        ...env,
        ELECTRON_RUN_AS_NODE: '1',
      },
    }),
  );
}

function getElectronVersions() {
  try {
    return getElectronEnv();
  } catch {
    return undefined;
  }
}

function getChromeVersion() {
  const versions = getElectronVersions();
  return versions?.chrome;
}

function getNodeVersion() {
  const versions = getElectronVersions();
  return versions?.node;
}

/**
 * @param version - The version string to parse
 * @returns The major version number
 */
function getMajorVersion(version: string): number {
  const majorPart = version.split('.')[0];
  return majorPart ? Number.parseInt(majorPart, 10) : 0;
}

export function getChromeMajorVersion(): number | undefined {
  const chromeVersion = getChromeVersion();
  return chromeVersion ? getMajorVersion(chromeVersion) : undefined;
}

export function getNodeMajorVersion(): number | undefined {
  const nodeVersion = getNodeVersion();
  return nodeVersion ? getMajorVersion(nodeVersion) : undefined;
}
