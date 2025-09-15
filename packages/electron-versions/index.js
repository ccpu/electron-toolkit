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

function createElectronEnvLoader() {
  /** @type {Record<string, string> | null} */
  let inMemoryCache = null;

  return () => {
    if (inMemoryCache) {
      return inMemoryCache;
    }

    inMemoryCache = getElectronEnv();
    return inMemoryCache;
  };
}

const envLoader = createElectronEnvLoader();

export function getElectronVersions() {
  return envLoader();
}

export function getChromeVersion() {
  const versions = getElectronVersions();
  return versions?.chrome;
}

export function getChromeMajorVersion() {
  const chromeVersion = getChromeVersion();
  return chromeVersion ? getMajorVersion(chromeVersion) : undefined;
}

export function getNodeVersion() {
  const versions = getElectronVersions();
  return versions?.node;
}

export function getNodeMajorVersion() {
  const nodeVersion = getNodeVersion();
  return nodeVersion ? getMajorVersion(nodeVersion) : undefined;
}

/**
 * @param {string} version
 * @returns {number} The major version number
 */
function getMajorVersion(version) {
  const majorPart = version.split('.')[0];
  return majorPart ? Number.parseInt(majorPart, 10) : 0;
}
