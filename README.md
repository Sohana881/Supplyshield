# 🛡️ SupplyShield

## Autonomous Multi-Agent Supply Chain Recovery & Resilience Platform

> **Detect disruption. Reason across the supply chain. Verify recovery. Act safely.**

<div align="center">

### 👥 TEAM TWOPOINTERS

**Track:** Smart Health & Supply Chain Resilience  
**Hackathon:** Build with AI: Code for Communities — Second Edition  
**Platform:** Hack2Skill  
**License:** MIT

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-Frontend-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-Build-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![Google_ADK](https://img.shields.io/badge/Google-ADK-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://google.github.io/adk-docs/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

</div>

---

# 🚨 THE PROBLEM

Supply-chain disruptions rarely affect only one operational component.

A delayed shipment can simultaneously create:

- 📦 Inventory shortages
- 🏭 Production risk
- 🚚 Logistics constraints
- 🏢 Supplier dependency
- 💰 Financial exposure
- ⚠️ Operational risk
- 🛒 Emergency procurement requirements

Traditional workflows require teams to manually connect these signals across inventory, logistics, suppliers, finance, procurement, and risk systems.

This creates three critical problems:

1. **Fragmented decision-making**
2. **Slow recovery response**
3. **High risk of acting on incomplete information**

SupplyShield converts this fragmented process into a **coordinated, observable and policy-governed recovery workflow**.

---

# 💡 THE SOLUTION

**SupplyShield** is an AI-powered multi-agent supply-chain resilience platform that investigates disruptions, evaluates their downstream impact, identifies recovery options, validates them against deterministic policies, and produces a structured recovery plan.

Instead of asking one AI agent to solve the entire problem, SupplyShield distributes the investigation across specialized agents.

    SUPPLY CHAIN DISRUPTION
             │
             ▼
      ┌───────────────┐
      │ COMMAND AGENT │
      └───────┬───────┘
              │
       ┌──────┼──────┬────────┬────────┐
       ▼      ▼      ▼        ▼        ▼
    Inventory Shipment Supplier Logistics Finance
      Agent     Agent    Agent    Agent    Agent
       │         │        │        │        │
       └─────────┴────────┼────────┴────────┘
                          ▼
                    ┌───────────┐
                    │ RISK AGENT│
                    └─────┬─────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ PROCUREMENT     │
                 │ AGENT           │
                 └────────┬────────┘
                          │
                          ▼
                   VERIFIED FINDINGS
                          │
                          ▼
                  SECURITY / POLICY
                       VALIDATION
                          │
                    ┌─────┴─────┐
                    ▼           ▼
                 FEASIBLE     BLOCKED
                   PLAN        ACTION
                    │           │
                    ▼           ▼
              RECOVERY PLAN  NO_FEASIBLE_PLAN

---

# 🧠 CORE PRINCIPLE

> **LLMs reason. Deterministic tools verify. Policies govern. Humans remain in control.**

SupplyShield is intentionally designed so that the language model is **not the source of truth** for critical operational calculations.

Instead:

| Layer | Responsibility |
|---|---|
| 🤖 AI Agents | Reasoning, coordination and synthesis |
| 🧮 Deterministic Tools | Calculations and source-of-truth operations |
| 🛡️ Security Engine | Authorization and policy enforcement |
| 📊 Control Room | Visualization and operational awareness |
| 🔍 Audit Layer | Traceability and observability |
| 👤 Human Operators | Oversight and authorization |

---

# 🤖 MULTI-AGENT SYSTEM

SupplyShield decomposes supply-chain recovery into specialized operational roles.

| Agent | Responsibility |
|---|---|
| 📦 **Inventory Agent** | Calculates inventory position, runway and shortage exposure |
| 🚢 **Shipment Agent** | Investigates delayed shipments and shipment-level risk |
| 🏭 **Supplier Agent** | Identifies supplier alternatives and supplier constraints |
| 🚚 **Logistics Agent** | Evaluates routes, capacity and expedited transportation |
| 💰 **Finance Agent** | Validates financial constraints and recovery economics |
| ⚠️ **Risk Agent** | Aggregates operational risk across the incident |
| 🛒 **Procurement Agent** | Generates emergency procurement proposals |
| 🎯 **Command Agent** | Coordinates findings and synthesizes the final recovery plan |

Each agent has a defined responsibility rather than unrestricted access to every capability.

---

# 🔥 REAL RECOVERY ORCHESTRATION

SupplyShield does **not** automatically assume that a delayed shipment requires emergency procurement.

For the supplied incident:

### `SHP001`

    SHIPMENT DELAY
          │
          ▼
      ~6 DAY DELAY
          │
          ▼
    ~3.31 DAYS INVENTORY RUNWAY
          │
          ▼
    CAN EXISTING SHIPMENT
       BE EXPEDITED?
          │
     ┌────┴────┐
     ▼         ▼
    YES        NO
     │         │
     ▼         ▼
 EXPEDITE    EMERGENCY
 VIABLE      PROCUREMENT
 QUANTITY        │
     │            │
     └─────┬──────┘
           ▼
    POLICY VALIDATION
           │
      ┌────┴────┐
      ▼         ▼
   FEASIBLE   BLOCKED
      │         │
      ▼         ▼
 RECOVERY   NO_FEASIBLE_PLAN
   PLAN

The system first checks whether a sufficient portion of the delayed shipment can be expedited using an **origin-compatible route with sufficient capacity**.

Only if that path is not viable does the system fall back to emergency procurement.

If neither path satisfies the constraints, the system returns:

    NO_FEASIBLE_PLAN

SupplyShield does **not fabricate a successful recovery** simply to make the dashboard look good.

---

# 🏗️ SYSTEM ARCHITECTURE

    ┌─────────────────────────────────────────┐
    │             REACT + VITE                │
    │          SUPPLYSHIELD CONTROL ROOM      │
    └───────────────────┬─────────────────────┘
                        │
                     REST API
                        │
                        ▼
    ┌─────────────────────────────────────────┐
    │             FASTAPI BACKEND             │
    └───────────────────┬─────────────────────┘
                        │
          ┌─────────────┼──────────────┐
          │             │              │
          ▼             ▼              ▼
    ┌───────────┐ ┌────────────┐ ┌──────────────┐
    │Deterministic│ │ Security   │ │ Audit &      │
    │Tools + Data │ │ Engine     │ │Observability │
    └─────┬─────┘ └──────┬─────┘ └──────────────┘
          │              │
          └──────────────┼─────────────────┐
                         ▼                 │
              ┌──────────────────────┐    │
              │     GOOGLE ADK       │    │
              │     AGENT LAYER      │    │
              ├──────────────────────┤    │
              │ Inventory            │    │
              │ Shipment             │    │
              │ Supplier             │    │
              │ Logistics            │    │
              │ Finance              │    │
              │ Risk                 │    │
              │ Procurement          │    │
              │ Command              │    │
              └──────────┬───────────┘    │
                         │                │
                         ▼                │
                  VERIFIED FINDINGS       │
                         │                │
                         ▼                │
                   POLICY GATE ◄─────────┘
                         │
                         ▼
                 STRUCTURED RESULT
                         │
                         ▼
                  REACT DASHBOARD

---

# 🔐 SECURITY-FIRST ARCHITECTURE

Agentic systems should not have unrestricted access to sensitive operations.

SupplyShield places a deterministic security layer **before execution**.

    AGENT ACTION REQUEST
             │
             ▼
    ┌──────────────────────┐
    │    SECURITY ENGINE   │
    ├──────────────────────┤
    │ Agent Permissions    │
    │ Policy Checks        │
    │ Input Validation     │
    │ Action Constraints   │
    └──────────┬───────────┘
               │
          ┌────┴────┐
          ▼         ▼
        ALLOW      BLOCK
          │         │
          ▼         ▼
       EXECUTE   AUDIT EVENT
          │
          ▼
       AUDIT EVENT

Security policies are centralized in:

    data/policies.json

External supplier messages are treated as **untrusted data**.

They cannot:

- Grant themselves permissions
- Override security policies
- Execute privileged tools
- Modify authorization rules
- Bypass the security engine

---

# 🧪 MALICIOUS SUPPLIER DEMO

SupplyShield includes a security demonstration showing how an untrusted supplier instruction is handled.

    SUPPLIER INSTRUCTION
             │
             ▼
       UNTRUSTED INPUT
             │
             ▼
       SECURITY ENGINE
             │
             ▼
       POLICY EVALUATION
             │
        ┌────┴────┐
        ▼         ▼
      ALLOW      BLOCK
                   │
                   ▼
              AUDIT EVENT
                   │
                   ▼
          EXECUTOR NOT CALLED

The malicious request is stopped **before the privileged executor is reached**.

---

# 📊 CONTROL ROOM

The React dashboard acts as the operational command center for the supply-chain incident.

### Dashboard visibility

- 🚨 Active disruptions
- 📦 Inventory runway
- 🚢 Delayed shipments
- 🏭 Supplier status
- 🚚 Route options
- 💰 Financial constraints
- 🤖 Agent activity
- ⚠️ Risk indicators
- 🔐 Security events
- 🔄 Recovery timeline
- 📋 Procurement proposals

### Dynamic Recovery Timeline

The recovery timeline is populated from the **actual backend workflow**.

It is not a hardcoded frontend animation.

    INCIDENT DETECTED
           ↓
    SHIPMENT INVESTIGATED
           ↓
    INVENTORY RISK CALCULATED
           ↓
    ROUTES EVALUATED
           ↓
    SUPPLIER ALTERNATIVES CHECKED
           ↓
    FINANCIAL POLICY VALIDATED
           ↓
    RECOVERY PLAN GENERATED
           ↓
    SECURITY GATE
           ↓
    FINAL RECOVERY STATE

---

# 🧰 TECHNOLOGY STACK

## AI / Agentic Layer

- Google ADK
- Gemini
- Multi-agent orchestration
- Structured agent outputs

## Backend

- Python
- FastAPI
- Deterministic supply-chain tools
- Policy engine
- CSV / JSON source data

## Frontend

- React
- Vite
- Component-driven control dashboard
- API-driven state

## Infrastructure

- Docker
- Docker Compose
- Nginx

## Governance

- Security engine
- Policy definitions
- Audit events
- Firestore-compatible audit storage
- Local JSONL fallback

---

# 📁 PROJECT STRUCTURE

    SupplyShield/
    │
    ├── backend/
    │   ├── main.py
    │   ├── agents/
    │   ├── tools/
    │   ├── security/
    │   └── ...
    │
    ├── data/
    │   ├── policies.json
    │   ├── inventory/
    │   ├── shipments/
    │   ├── suppliers/
    │   └── ...
    │
    ├── frontend/
    │   ├── src/
    │   ├── public/
    │   ├── package.json
    │   └── vite.config.*
    │
    ├── security/
    │   └── audit_log.jsonl
    │
    ├── requirements.txt
    ├── requirements-dev.txt
    ├── docker-compose.yml
    ├── .env.example
    ├── LICENSE
    └── README.md

---

# 🔌 API SURFACE

| Endpoint | Description |
|---|---|
| `GET /health` | Backend health check |
| `GET /api/dashboard` | Dashboard data |
| `GET /api/agents` | Agent status |
| `GET /api/inventory` | Inventory information |
| `GET /api/inventory/{product_id}/risk` | Inventory risk |
| `GET /api/shipments/delayed` | Delayed shipments |
| `GET /api/shipments/{shipment_id}` | Shipment details |
| `GET /api/shipments/{shipment_id}/risk` | Shipment risk |
| `GET /api/suppliers/product/{product_id}` | Supplier information |
| `GET /api/suppliers/options/{product_id}` | Alternative suppliers |
| `GET /api/routes/best` | Route evaluation |
| `GET /api/finance/policy` | Financial policy |
| `POST /api/finance/check` | Financial validation |
| `POST /api/recovery` | Execute recovery orchestration |
| `GET /api/purchase-orders` | Purchase-order state |
| `POST /api/purchase-orders/proposals` | Generate PO proposal |
| `GET /api/security/events` | Security audit events |
| `GET /api/security/policies` | Active security policies |
| `POST /api/security/evaluate` | Evaluate an action |
| `POST /api/security/demo/supplier-export` | Malicious supplier demonstration |

---

# 📡 RECOVERY API

### Standard recovery request

    {
      "shipment_id": "SHP001"
    }

### Replan while excluding a disrupted supplier

    {
      "shipment_id": "SHP001",
      "exclude_supplier_ids": [
        "SUP002"
      ]
    }

The backend performs the actual orchestration and returns a structured recovery result to the frontend.

---

# 🧠 DESIGN PRINCIPLES

### 01 — DETERMINISTIC TRUTH

LLMs are used for reasoning and orchestration.

Critical calculations remain grounded in deterministic tools and source data.

### 02 — NO FABRICATED SUCCESS

If a compliant recovery strategy cannot be found:

    NO_FEASIBLE_PLAN

is returned.

### 03 — LEAST PRIVILEGE

Agents receive only the capabilities required for their responsibilities.

### 04 — UNTRUSTED INPUTS STAY UNTRUSTED

External supplier messages cannot elevate their own permissions.

### 05 — OBSERVABLE AUTONOMY

Agent activity and security events are visible and auditable.

### 06 — HUMAN AUTHORIZATION

The current procurement and shipment tools generate proposals rather than silently modifying external ERP systems.

---

# 🌐 EXTENSIBLE ENTERPRISE ARCHITECTURE

SupplyShield uses a replaceable data/tool layer.

The development implementation uses CSV/JSON-backed deterministic tools, while the same interfaces can later connect to enterprise systems.

    DETERMINISTIC TOOL INTERFACE
                 │
        ┌────────┼────────┐
        │        │        │
        ▼        ▼        ▼
      CSV      PostgreSQL Firestore
      JSON        │        │
        │         │        │
        └─────────┼────────┘
                  │
                  ▼
             SUPPLYSHIELD
                  │
        ┌─────────┼─────────┐
        │         │         │
        ▼         ▼         ▼
       ERP       WMS       TMS
                            │
                            ▼
                  PROCUREMENT SYSTEMS

This allows the agent layer to evolve without rewriting the complete decision architecture.

---

# 🧪 TESTING

Install development dependencies:

    pip install -r requirements-dev.txt

Run the test suite:

    pytest -q

The tests cover:

- Deterministic tools
- Security guardrails
- Backend health
- API data contracts
- Agent presence
- Recovery orchestration
- Policy enforcement
- Mocked ADK execution

---

# ⚙️ LOCAL DEVELOPMENT

## 1. Clone the repository

    git clone <YOUR_REPOSITORY_URL>
    cd SupplyShield

## 2. Create virtual environment

    python -m venv .venv
    .venv\Scripts\activate

## 3. Install Python dependencies

    pip install -r requirements.txt

## 4. Configure Gemini

Copy:

    .env.example

to:

    .env

Set:

    GOOGLE_API_KEY=your_key_here

> ⚠️ Never commit `.env` to GitHub.

## 5. Start backend

    uvicorn backend.main:app --reload

Backend:

    http://127.0.0.1:8000

API documentation:

    http://127.0.0.1:8000/docs

## 6. Start frontend

Open another terminal:

    cd frontend
    npm install
    npm run dev

Frontend:

    http://localhost:5173

---

# 🐳 DOCKER DEPLOYMENT

Set your Gemini API key in the environment and run:

    docker compose up --build

Open:

    http://localhost:5173

The frontend Nginx container proxies:

    /api/*

to the FastAPI backend.

---

# 🔭 ROADMAP

    CURRENT
       │
       ├── Multi-Agent Recovery
       ├── Deterministic Tools
       ├── Security Governance
       ├── Auditability
       └── Interactive Control Room
                │
                ▼
              NEXT
                │
       ├── Live ERP Integration
       ├── Streaming Shipment Events
       ├── External Disruption Intelligence
       ├── Human Approval Workflows
       ├── Persistent Enterprise Memory
       └── Advanced Scenario Simulation
                │
                ▼
              VISION
                │
                ▼
       GOVERNED AUTONOMOUS
       SUPPLY-CHAIN RESILIENCE
       INFRASTRUCTURE

---

# 🏆 WHY SUPPLYSHIELD?

SupplyShield is built around a fundamental distinction:

> **An AI system should not simply generate an answer. It should investigate, verify, respect constraints, explain its decision, and fail safely when no valid answer exists.**

That is why SupplyShield combines:

    AI REASONING
          +
    DETERMINISTIC TOOLS
          +
    SECURITY GOVERNANCE
          +
    AUDITABILITY
          +
    HUMAN OVERSIGHT
          │
          ▼
    TRUSTWORTHY RECOVERY

---

# 📈 FROM REACTIVE TO RESILIENT

    TRADITIONAL WORKFLOW

    Disruption
         ↓
    Manual Investigation
         ↓
    Multiple Teams
         ↓
    Fragmented Decisions
         ↓
    Delayed Response


    SUPPLYSHIELD

    Disruption
         ↓
    Multi-Agent Investigation
         ↓
    Deterministic Verification
         ↓
    Risk Evaluation
         ↓
    Policy Validation
         ↓
    Recovery Proposal
         ↓
    Auditable Decision

---

# 👥 TEAM TWOPOINTERS

## SupplyShield

Built for:

**Smart Health & Supply Chain Resilience**

Built with:

- 🤖 Agentic AI
- 🧠 Multi-Agent Systems
- ⚙️ Deterministic Decision Tools
- 🛡️ Security Governance
- 📊 Data-Driven Operations
- 🌐 Full-Stack Engineering

---

# 🏁 SUBMISSION

## Build with AI: Code for Communities — Second Edition

**Hack2Skill**

🔗 https://hack2skill.com/event/codeforcommunities2/

SupplyShield is submitted as a software-first solution focused on **Smart Health & Supply Chain Resilience**, combining agentic AI, deterministic decision systems, security governance, and full-stack engineering.

---

# 📜 LICENSE

This project is licensed under the **MIT License**.

See the [`LICENSE`](LICENSE) file for the complete license text.

---

<div align="center">

# 🛡️ SUPPLYSHIELD

### Detect. Reason. Verify. Recover.

**Team TWOPOINTERS**

*Autonomous supply-chain resilience, built with governed AI.*

</div>
