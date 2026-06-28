# Publishing and Deployment Guide

This guide details how to build the TradeFlowX solution package, deploy it to a UiPath Orchestrator tenant, and establish integration service connections.

---

## 1. Solution Packaging

The orchestrations, stages, variables, and rules for TradeFlowX are bundled into a UiPath Solution Package (`.uipx`). 

### Build Package via UiPath CLI (`uip`)
Ensure you have the UiPath CLI installed. Run the following command from the root of the repository to pack the solution:

```bash
# Sync resource bindings prior to packing
uip solution resources refresh --solution-folder 00_CaseOrchestration

# Pack the solution into a deployable .zip package
uip solution pack 00_CaseOrchestration ./dist --version 1.0.0 --output json
```

### Build Package via Studio Web
Alternatively, you can pack the solution directly in **UiPath Studio Web**:
1.  Open **Studio Web** in your Automation Cloud tenant.
2.  Click **Import Project** and upload the `00_CaseOrchestration` folder or link it directly from your Git repository.
3.  Once open, select **Publish** from the top right to compile the project.

---

## 2. Deploying & Activating the Case

Once you have compiled the solution package, you need to publish and activate it on your tenant.

### Deployment Commands
You can publish and deploy the package using the UiPath CLI:

```bash
# Publish the solution package to your tenant solution feed
uip solution publish ./dist/TradeFlowImportSolution.1.0.0.zip --output json

# Deploy the solution (which provisions processes, queue resources, etc., and activates it)
uip solution deploy run \
  --name "TradeFlowImport-Dev" \
  --package-name "TradeFlowImportSolution" \
  --package-version "1.0.0" \
  --folder-name "TradeFlowImport" \
  --parent-folder-path "Shared" \
  --output json
```

## 3. Creating Storage Buckets

The system stores commercial invoices, packing lists, and bills of lading in a UiPath Storage Bucket. 

1.  In Orchestrator, navigate to the **Storage Buckets** tab under your folder.
2.  Click **Add Storage Bucket**.
3.  Name the bucket **`ShipmentDocuments`**.
4.  Choose the provider (UiPath Orchestrator or AWS S3/Azure Blob Storage as configured on your tenant) and save.

---

## 4. Configuring Integration Service Connections

Maestro Case Triggers and tasks interact with Microsoft 365 and Salesforce through **UiPath Integration Service**.

1.  In Automation Cloud, navigate to **Integration Service**.
2.  Click **Connectors** and search for **Microsoft Outlook 365**.
    *   Click **Add Connection** and authenticate with the email address designated to monitor incoming trade orders.
3.  Search for **Salesforce**.
    *   Click **Add Connection** and authorize access to your Salesforce CRM sandbox or production instance.
4.  Verify that both connections are successfully established and show a `Connected` status.
5.  In the case plan triggers, ensure the trigger bindings are mapped to the newly created connections.
