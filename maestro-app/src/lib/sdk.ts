import { UiPath } from '@uipath/uipath-typescript/core';
import { Cases, CaseInstances } from '@uipath/uipath-typescript/cases';
import { Tasks } from '@uipath/uipath-typescript/tasks';
import { Entities } from '@uipath/uipath-typescript/entities';
import { ProcessInstances, MaestroProcesses } from '@uipath/uipath-typescript/maestro-processes';

const VITE_PROXY = window.location.origin;
const STAGING_URL = 'https://staging.uipath.com';

// Setup global fetch interceptor to route staging requests through Vite proxy to avoid CORS
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;
  if (typeof resource === 'string' && resource.startsWith(STAGING_URL)) {
    resource = resource.replace(STAGING_URL, '');
  } else if (resource instanceof Request && resource.url.startsWith(STAGING_URL)) {
    resource = new Request(resource.url.replace(STAGING_URL, ''), resource);
  }
  return originalFetch(resource, config);
};

const baseUrl = import.meta.env.VITE_UIPATH_BASE_URL || STAGING_URL;
const clientId = import.meta.env.VITE_UIPATH_CLIENT_ID || 'mock-client-id';
const scope = import.meta.env.VITE_UIPATH_SCOPE || 'openid profile PIMS DataFabric.Schema.Read DataFabric.Data.Read DataFabric.Data.Write OR.Tasks OR.Audit';
const orgName = import.meta.env.VITE_UIPATH_ORG_NAME || 'mock-org';
const tenantName = import.meta.env.VITE_UIPATH_TENANT_NAME || 'mock-tenant';

// Initialize core UiPath SDK client configuration
export const sdk = new UiPath({
  baseUrl,
  clientId,
  scope,
  orgName,
  tenantName,
  redirectUri: window.location.origin + '/callback',
});

// Configure singleton service instances wrapping their respective API boundaries
export const casesSvc = new Cases(sdk);
export const caseInstancesSvc = new CaseInstances(sdk);
export const tasksSvc = new Tasks(sdk);
export const entitiesSvc = new Entities(sdk);
export const piSvc = new ProcessInstances(sdk);
export const maestroProcessesSvc = new MaestroProcesses(sdk);

// ─── Data Fabric helper façade (correct SDK method names) ────────────────────
// Wraps Entities SDK with typed, aliased method names used across the app.
export const dfHelper = {
  /** List all records for an entity */
  getAll: (entityId: string) =>
    entitiesSvc.getAllRecords(entityId),

  /** Query records with OData filter */
  query: (entityId: string, filter: string) => {
    // Parse filter strings like "CaseRef eq 'value'" or "CaseRef = 'value'"
    const match = filter.match(/^\s*(\w+)\s+(eq|=)\s+['"]([^'"]*)['"]\s*$/i);
    if (match) {
      const [, fieldName, , value] = match;
      return entitiesSvc.queryRecordsById(entityId, {
        filterGroup: {
          queryFilters: [{
            fieldName,
            operator: '=' as any,
            value
          }]
        }
      });
    }
    console.warn(`[dfHelper.query] Could not parse filter string: "${filter}". Falling back to querying without filters.`);
    return entitiesSvc.queryRecordsById(entityId);
  },

  /** Insert a single record */
  insert: (entityId: string, data: Record<string, unknown>) =>
    entitiesSvc.insertRecordById(entityId, data),
};


