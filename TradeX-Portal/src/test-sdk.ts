import { UiPath } from '@uipath/uipath-typescript/core';
import { Tasks } from '@uipath/uipath-typescript/tasks';
import { MaestroProcesses } from '@uipath/uipath-typescript/maestro-processes';

async function testSDK() {
  console.log("=== STARTING SDK TEST ===");

  const baseUrl = import.meta.env.VITE_UIPATH_BASE_URL || 'https://staging.uipath.com';
  const clientId = import.meta.env.VITE_UIPATH_CLIENT_ID;
  const orgName = import.meta.env.VITE_UIPATH_ORG_NAME;
  const tenantName = import.meta.env.VITE_UIPATH_TENANT_NAME;
  const folderKey = import.meta.env.VITE_FOLDER_KEY || 'Shared/TradeFlowAICase1';

  // 1. Initialize SDK
  const sdk = new UiPath({
    baseUrl,
    orgName,
    tenantName,
    clientId,
    redirectUri: window.location.origin + '/callback',
    scope: 'OR.Tasks OR.Tasks.Read OR.Tasks.Write OR.BackgroundTasks OR.Folders OR.Folders.Read OR.Execution OR.Assets OR.Queues OR.StorageCylinders OR.StorageCylinders.Read OR.StorageCylinders.Write OR.DataFabric OR.DataFabric.Read OR.DataFabric.Write Maestro.Processes Maestro.Processes.Read Maestro.Processes.Write Maestro.Cases Maestro.Cases.Read Maestro.Cases.Write'
  });

  try {
    // CRITICAL: We MUST call initialize() before using the SDK!
    // This loads the token from sessionStorage into the SDK's execution context.
    console.log("Calling sdk.initialize()...");
    await sdk.initialize();
    
    if (!sdk.isAuthenticated()) {
      console.log("Not authenticated! Please login first.");
      return;
    }
    console.log("SDK Authenticated! Token loaded.");

    // 2. Test Tasks Service
    const tasks = new Tasks(sdk);
    console.log("Fetching Tasks with folderKey:", folderKey);
    // @ts-ignore
    const allTasks = await tasks.getAll({ folderKey });
    console.log("Tasks retrieved:", allTasks);

    // 3. Test Maestro Processes Service
    const maestroProcesses = new MaestroProcesses(sdk);
    console.log("Fetching Maestro Processes...");
    const processes = await maestroProcesses.getAll();
    console.log("Processes retrieved:", processes);

    console.log("=== SDK TEST SUCCESSFUL ===");

  } catch (error) {
    console.error("=== SDK TEST FAILED ===", error);
  }
}

// Attach to window so you can easily run it from the browser console
(window as any).runSdkTest = testSDK;
