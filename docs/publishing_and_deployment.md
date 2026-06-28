# Publishing and Deployment Guide

This guide details how to build the TradeFlow import solution package, deploy it to a UiPath Orchestrator tenant, configure the necessary cloud assets, and establish integration service connections.

---

## 1. Solution Packaging

The orchestrations, stages, variables, and rules for TradeFlow Maestro AI are bundled into a UiPath Solution Package (`.uipx`). 

### Build Package via UiPath CLI (`uip`)
Ensure you have the UiPath CLI installed. Run the following command from the root of the repository to pack the solution:

```bash
# Sync resource bindings prior to packing
uip solution resources refresh --solution-folder TradeXCase/TradeFlowImportSolution

# Pack the solution into a deployable .uipx package
uip solution pack --solution-folder TradeXCase/TradeFlowImportSolution --output-file TradeFlowImportSolution.uipx
```

### Build Package via Studio Web
Alternatively, you can pack the solution directly in **UiPath Studio Web**:
1.  Open **Studio Web** in your Automation Cloud tenant.
2.  Click **Import Project** and upload the `TradeXCase/TradeFlowImportSolution` folder or link it directly from your Git repository.
3.  Once open, select **Publish** from the top right to compile the project.

---

## 2. Deploying & Activating the Case

Once you have compiled the `TradeFlowImportSolution.uipx` file, you need to publish and activate it on your tenant.

### Deployment Commands
You can upload the package directly using the UiPath CLI:

```bash
# Upload the solution package to the tenant
uip solution upload --file TradeFlowImportSolution.uipx --output json

# Deploy the solution (which provision processes, queue resources, etc.)
uip solution deploy --package-id TradeFlowImportSolution --version 1.0.0

# Activate the Case App in Maestro
uip solution activate --package-id TradeFlowImportSolution
```

---

## 3. Creating Required Orchestrator Assets

Before running the case, you must provision several configuration assets in your target **UiPath Orchestrator Folder**. These assets contain API keys and base URLs used by both the RPA bots and the Python agents.

| Asset Name | Type | Value / Description |
|---|---|---|
| `ACE_API_KEY` | Text | API token for the US Customs & Border Protection (CBP) ACE Portal environment. |
| `OFAC_API_KEY` | Text | API key for the Office of Foreign Assets Control SDN list querying API. |
| `USITC_API_BASE_URL` | Text | Base URL for USITC Harmonized Tariff Schedule API (default: `https://api.usitc.gov/`). |
| `ERP_BASE_URL` | Text | Endpoint URL of the corporate ERP instance (SAP, NetSuite, Oracle, etc.). |
| `ERP_API_KEY` | Credential | Credentials/Token to authorize transactions posted to the ERP. |
| `LLM_API_KEY` | Credential | OpenAI API Key or Azure OpenAI endpoint credentials used by the LangGraph agents. |

### Steps to Create Assets in Orchestrator:
1.  Log in to **UiPath Automation Cloud** and navigate to **Orchestrator**.
2.  Select your target **Folder** (e.g., `Shared` or `ImportOperations`).
3.  Go to the **Assets** tab and click **Add Asset**.
4.  Create each asset listed above, choosing the corresponding Type (Text or Credential) and inputting the values.

---

## 4. Creating Storage Buckets

The system stores commercial invoices, packing lists, and bills of lading in a UiPath Storage Bucket. 

1.  In Orchestrator, navigate to the **Storage Buckets** tab under your folder.
2.  Click **Add Storage Bucket**.
3.  Name the bucket **`ShipmentDocuments`**.
4.  Choose the provider (UiPath Orchestrator or AWS S3/Azure Blob Storage as configured on your tenant) and save.

---

## 5. Configuring Integration Service Connections

Maestro Case Triggers and tasks interact with Microsoft 365 and Salesforce through **UiPath Integration Service**.

1.  In Automation Cloud, navigate to **Integration Service**.
2.  Click **Connectors** and search for **Microsoft Outlook 365**.
    *   Click **Add Connection** and authenticate with the email address designated to monitor incoming trade orders.
3.  Search for **Salesforce**.
    *   Click **Add Connection** and authorize access to your Salesforce CRM sandbox or production instance.
4.  Verify that both connections are successfully established and show a `Connected` status.
5.  In the case plan triggers, ensure the trigger bindings are mapped to the newly created connections.
