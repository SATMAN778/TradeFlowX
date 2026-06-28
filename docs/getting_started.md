# Getting Started Guide

This guide describes how to set up your local development environment to run and develop the **TradeFlow Maestro AI** system.

---

## 1. Prerequisites

Before starting, ensure your machine has the following tools installed:

*   **Python 3.10+**: Required for the LangGraph AI agents.
*   **Node.js v18+ & npm**: Required for running the `TradeX-Portal` React/TypeScript app.
*   **Git**: For version control.
*   **UiPath Platform Access**: An active UiPath Automation Cloud tenant with Maestro and Studio Web enabled.

---

## 2. Directory Structure Overview

The repository is structured as a monorepo containing multiple agents and a frontend application:

```
TradeFlowAICase/
├── docs/                                      # Project documentation
├── TradeX-Portal/                             # Vite + TypeScript React Web App
├── 00_CaseOrchestration/                      # UiPath Maestro Case Solution folder (.uipx)
├── 01_Agent_TransshipmentRisk_LangGraph/      # Python LangGraph agent for transshipment risk
├── 03_Agent_HTSClassifier_LangGraph/          # Python LangGraph agent for HTS classification
├── 07_Agent_DutySavings_LangGraph/            # Python LangGraph agent for duty drawback analysis
├── 01_TradeOrderIntake/ to 07_PostEntry/      # RPA integration workflow stages
├── App_CaseUI/                                # Action Center Custom Task App views
└── README.md                                  # Main readme file
```

---

## 3. Local Setup

### Step A: Clone the Repository
Clone this repository to your local directory:
```bash
git clone https://github.com/your-username/TradeFlowAICase.git
cd TradeFlowAICase
```

### Step B: Configure the Python Agents
For each of the three agent directories (`03_Agent_HTSClassifier_LangGraph`, `01_Agent_TransshipmentRisk_LangGraph`, `07_Agent_DutySavings_LangGraph`), perform the following configuration steps:

1.  **Navigate to the agent directory**:
    ```bash
    cd 03_Agent_HTSClassifier_LangGraph
    ```
2.  **Create a virtual environment**:
    ```bash
    python -m venv venv
    ```
3.  **Activate the virtual environment**:
    *   **Windows**: `venv\Scripts\activate`
    *   **macOS/Linux**: `source venv/bin/activate`
4.  **Install dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
5.  **Set up Environment Variables**:
    Copy the sample environment file and fill in your details:
    ```bash
    cp .env.example .env   # Or edit the existing .env file
    ```
    *Note: Ensure you configure your API keys (e.g. `OPENAI_API_KEY` or enterprise LLM endpoints, and `UIPATH_CLIENT_ID` / `UIPATH_CLIENT_SECRET` if connecting to queues/orchestrator).*

Repeat these steps for `01_Agent_TransshipmentRisk_LangGraph` and `07_Agent_DutySavings_LangGraph`.

---

## 4. Setting up the TradeX Portal Web App

The custom operations dashboard resides in the `TradeX-Portal` directory.

1.  **Navigate to the portal directory**:
    ```bash
    cd TradeX-Portal
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Configure environment variables**:
    Configure the `.env` file with your UiPath orchestrator tenant variables:
    ```env
    VITE_UIPATH_ORCHESTRATOR_URL=https://cloud.uipath.com/your-org/your-tenant
    VITE_CASE_DEFINITION_ID=case-TradeXCase0
    ```
4.  **Run the local development server**:
    ```bash
    npm run dev
    ```
    The application will be accessible at `http://localhost:5173`.

---

## 5. Development Workflow

1.  **Modifying Case Layout or Logic**:
    Use UiPath Studio or Studio Web to import the Maestro case from `00_CaseOrchestration`.
2.  **Modifying Agents**:
    Make edits inside the corresponding agent directory (`src/` or `main.py`). Test changes locally by feeding mock data from `test_input.json`:
    ```bash
    python main.py < test_input.json
    ```
3.  **Submitting Changes**:
    Ensure code changes conform to the existing styles, and run unit tests if present, before committing.
