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
├── docs/                             # Project documentation
├── TradeX-Portal/                    # Vite + TypeScript React Web App / Coded App
├── TradeXCase/                       # UiPath Maestro Case Solution definition
│   └── TradeFlowImportSolution/      # Solution folder (.uipx package workspace)
├── hts-classifier-agent/             # Python LangGraph agent for HTS code classification
├── transshipment-risk-agent/         # Python LangGraph agent for transshipment checks
├── duty-savings-agent/               # Python LangGraph agent for duty drawback opportunities
└── README.md                         # Main readme file
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
For each of the three agent directories (`hts-classifier-agent`, `transshipment-risk-agent`, `duty-savings-agent`), perform the following configuration steps:

1.  **Navigate to the agent directory**:
    ```bash
    cd hts-classifier-agent
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

Repeat these steps for `transshipment-risk-agent` and `duty-savings-agent`.

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
    Use UiPath Studio or Studio Web to import the Maestro case from `TradeXCase/TradeFlowImportSolution`.
2.  **Modifying Agents**:
    Make edits inside the corresponding agent directory (`src/` or `main.py`). Test changes locally by feeding mock data from `test_input.json`:
    ```bash
    python main.py < test_input.json
    ```
3.  **Submitting Changes**:
    Ensure code changes conform to the existing styles, and run unit tests if present, before committing.
