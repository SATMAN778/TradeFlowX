import { UiPath } from '@uipath/uipath-typescript/core';

// Initialize the SDK using the Coded Apps pattern
// This relies on meta tags injected at deploy time, or local setup via uipath.json
export const sdk = new UiPath();

let initialized = false;

export const initSdk = async () => {
  if (!initialized) {
    try {
      await sdk.initialize();
      initialized = true;
      console.log('UiPath SDK initialized successfully');
    } catch (error) {
      console.error('Failed to initialize UiPath SDK:', error);
      // For development, we might not have the credentials, so we catch and log
    }
  }
};
