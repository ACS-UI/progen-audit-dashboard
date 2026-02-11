/* eslint-disable no-console */
const CONFIG_KEY = 'config';
const CONFIG_FILE_NAME = 'configs.json';
// store configs globally to avoid multiple requests
window.configsPromises = {};

/*
 * Returns the true origin of the current page in the browser.
 * If the page is running in a iframe with srcdoc, the ancestor origin is returned.
 * @returns {String} The true origin
 */
function getOrigin() {
  const { location } = window;
  return location.href === 'about:srcdoc' ? window.parent.location.origin : location.origin;
}

function buildConfigURL() {
  const origin = getOrigin();
  const configURL = new URL(`${origin}/${CONFIG_FILE_NAME}`);
  return configURL;
}

const getStoredConfig = () => sessionStorage.getItem(CONFIG_KEY);

const storeConfig = (configJSON) => sessionStorage.setItem(CONFIG_KEY, configJSON);

const getConfig = async () => {
  let configJSON = getStoredConfig();

  if (!configJSON) {
    const fetchGlobalConfig = fetch(buildConfigURL());
    try {
      const response = await fetchGlobalConfig;

      // Extract JSON data from responses
      configJSON = await response.text();
      storeConfig(configJSON);
    } catch (e) {
      console.error('no config loaded', e);
    }
  }

  // merge config and locale config
  const config = JSON.parse(configJSON);

  return config;
};

/**
 * This function retrieves a configuration value for a given environment.
 *
 * @param {string} configParam - The configuration parameter to retrieve.
 * @returns {Promise<string|undefined>} - The value of the configuration parameter, or undefined.
 */
export const getConfigValue = async (configParam) => {
  if (!window.configsPromise) {
    window.configsPromise = getConfig();
  }

  try {
    const configJSON = await window.configsPromise;
    const configElements = configJSON.data;
    return configElements.find((c) => c.key === configParam)?.value;
  } catch (e) {
    console.error('Error fetching config value:', e);
    return configParam;
  }
};

export default getConfigValue;
