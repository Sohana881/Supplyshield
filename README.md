# 🛡️ SupplyShield

## Autonomous Multi-Agent Supply Chain Recovery & Resilience Platform

> **Detect disruption. Reason across the supply chain. Verify recovery. Act safely.**

<p align="center">
  <b>Team TWOPOINTERS</b>
  <br/>
  Smart Health &amp; Supply Chain Resilience
  <br/>
  Build with AI: Code for Communities — Second Edition
  <br/><br/>
  🌐 <b><a href="https://supplyshield-app.vercel.app/">Live Demo</a></b>
  <br/>
  <sub>Experience SupplyShield in action — from disruption detection to AI-driven, policy-validated recovery.</sub>
</p>

<p align="center">
  <a href="https://supplyshield-app.vercel.app/">
    <img src="https://img.shields.io/badge/🚀_LIVE_DEMO-SupplyShield-000000?style=for-the-badge" alt="Live Demo"/>
  </a>
</p>

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Google ADK](https://img.shields.io/badge/Google-ADK-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://google.github.io/adk-docs/)
[![Gemini](https://img.shields.io/badge/Gemini-AI-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-Frontend-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-Build-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

</p>

---

# 🚨 The Problem

Supply-chain disruptions rarely affect only one operational component.

A delayed shipment can simultaneously create:

- 📦 Inventory shortages
- 🏭 Production risk
- 🚚 Logistics constraints
- 🏢 Supplier dependency
- 💰 Financial exposure
- ⚠️ Operational risk
- 🛒 Emergency procurement requirements

Traditional workflows require teams to manually connect these signals across inventory, logistics, suppliers, finance, procurement and risk systems.

This creates three critical problems:

| Problem | Impact |
|---|---|
| Fragmented information | Teams operate on disconnected signals |
| Slow decision-making | Recovery actions take too long |
| Unverified AI recommendations | Incorrect or unauthorized actions can create additional risk |

SupplyShield converts this fragmented process into a **coordinated, observable and policy-governed recovery workflow**.

---

# 💡 The Solution

**SupplyShield** is an AI-powered multi-agent supply-chain resilience platform that investigates disruptions, evaluates downstream impact, identifies recovery options, validates them against deterministic policies, and produces a structured recovery plan.

Instead of asking one general-purpose AI agent to solve the entire problem, SupplyShield decomposes the incident across specialized agents.

```mermaid
flowchart LR
    A["🚨 Supply Chain<br/>Disruption"] --> B["🎯 Command Agent"]

    B --> C["📦 Inventory Agent"]
    B --> D["🚢 Shipment Agent"]
    B --> E["🏭 Supplier Agent"]
    B --> F["🚚 Logistics Agent"]
    B --> G["💰 Finance Agent"]

    C --> H["⚠️ Risk Agent"]
    D --> H
    E --> H
    F --> H
    G --> H

    H --> I["🛒 Procurement Agent"]
    I --> J["🔎 Verified Findings"]

    J --> K{"🛡️ Policy &<br/>Security Gate"}

    K -->|Approved| L["✅ Recovery Plan"]
    K -->|Rejected| M["🚫 NO_FEASIBLE_PLAN"]
```

---

# 🧠 Core Principle

> **LLMs reason. Deterministic tools verify. Policies govern. Humans remain in control.**

SupplyShield deliberately separates AI reasoning from operational truth.

| Layer | Responsibility |
|---|---|
| 🤖 AI Agents | Reasoning, coordination and synthesis |
| 🧮 Deterministic Tools | Calculations and source-of-truth operations |
| 🛡️ Security Engine | Authorization and policy enforcement |
| 📊 Control Room | Visualization and operational awareness |
| 🔍 Audit Layer | Traceability and observability |
| 👤 Human Operators | Oversight and authorization |

This architecture prevents the system from treating an LLM-generated response as an automatically executable business decision.

---

# 🤖 Multi-Agent Architecture

SupplyChain recovery is inherently multi-dimensional.

SupplyShield therefore assigns dedicated responsibilities to specialized agents.

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

Each agent operates within a defined responsibility boundary.

---

# 🏗️ System Architecture

```mermaid
flowchart TB

    subgraph UI["🖥️ CONTROL ROOM"]
        A["React + Vite<br/>SupplyShield Dashboard"]
    end

    subgraph API["⚙️ APPLICATION LAYER"]
        B["FastAPI Backend"]
        C["Recovery API"]
        D["Security API"]
    end

    subgraph AI["🧠 GOOGLE ADK AGENT LAYER"]
        E["🎯 Command Agent"]
        F["📦 Inventory Agent"]
        G["🚢 Shipment Agent"]
        H["🏭 Supplier Agent"]
        I["🚚 Logistics Agent"]
        J["💰 Finance Agent"]
        K["⚠️ Risk Agent"]
        L["🛒 Procurement Agent"]
    end

    subgraph DATA["🗄️ SOURCE OF TRUTH"]
        M["CSV / JSON Data"]
        N["Deterministic Tools"]
        O["Policy Engine"]
    end

    subgraph GOVERNANCE["🔐 GOVERNANCE"]
        P["Security Engine"]
        Q["Audit Events"]
        R["Firestore / JSONL"]
    end

    A --> B
    B --> C
    B --> D

    C --> E

    E --> F
    E --> G
    E --> H
    E --> I
    E --> J
    E --> K
    E --> L

    F --> N
    G --> N
    H --> N
    I --> N
    J --> N
    K --> N
    L --> N

    M --> N
    N --> O

    D --> P
    O --> P

    P --> Q
    Q --> R

    E --> A
```

---

# 🔥 Real Recovery Orchestration

SupplyShield does **not** assume that a delayed shipment automatically requires emergency procurement.

For the supplied incident:

### `SHP001`

- Shipment delay: approximately **6 days**
- Available inventory runway: approximately **3.31 days**

The recovery engine evaluates whether the existing delayed shipment can first be used to bridge the runway through an expedited route.

```mermaid
flowchart TD

    A["🚨 Incident: SHP001"] --> B["📦 Calculate Inventory Runway"]

    B --> C["⏱️ ~3.31 Days Available"]
    C --> D["🚢 Shipment Delay: ~6 Days"]

    D --> E{"Can delayed shipment<br/>be partially expedited?"}

    E -->|YES| F["🚚 Find Origin-Compatible Route"]

    F --> G{"Sufficient Capacity<br/>and Policy Compliant?"}

    G -->|YES| H["⚡ Expedite Required Quantity"]
    H --> I["✅ Recovery Plan"]

    G -->|NO| J["🛒 Emergency Procurement"]

    E -->|NO| J

    J --> K{"Supplier + Finance +<br/>Policy Validation"}

    K -->|YES| I
    K -->|NO| L["🚫 NO_FEASIBLE_PLAN"]
```

### Recovery priority

The system evaluates:

1. **Existing delayed shipment**
2. **Expedited route feasibility**
3. **Route capacity**
4. **Origin compatibility**
5. **Policy compliance**
6. **Emergency procurement fallback**
7. **Supplier and financial constraints**
8. **Final recovery feasibility**

If no compliant recovery path exists, SupplyShield returns:

```text
NO_FEASIBLE_PLAN
```

It does **not fabricate a successful recovery** simply to produce a positive dashboard result.

---

# 🔄 End-to-End Recovery Flow

```mermaid
flowchart LR

    A["🚨 Disruption"] --> B["🔎 Multi-Agent Investigation"]

    B --> C["📦 Inventory"]
    B --> D["🚢 Shipment"]
    B --> E["🏭 Supplier"]
    B --> F["🚚 Logistics"]
    B --> G["💰 Finance"]

    C --> H["⚠️ Risk Evaluation"]
    D --> H
    E --> H
    F --> H
    G --> H

    H --> I["🛒 Recovery Options"]

    I --> J["🧮 Deterministic Verification"]

    J --> K["🛡️ Policy Validation"]

    K --> L{"Feasible?"}

    L -->|YES| M["📋 Recovery Proposal"]
    L -->|NO| N["🚫 NO_FEASIBLE_PLAN"]

    M --> O["👤 Human Oversight"]
    O --> P["✅ Governed Recovery"]
```

---

# 🔐 Security-First Architecture

Agentic systems should not have unrestricted access to sensitive operational actions.

SupplyShield therefore places a deterministic security engine **before execution**.

```mermaid
flowchart TD

    A["🤖 Agent Action Request"] --> B["🔐 Security Engine"]

    B --> C["Identity / Agent Validation"]
    C --> D["Permission Check"]
    D --> E["Policy Evaluation"]
    E --> F["Input Validation"]
    F --> G["Action Constraints"]

    G --> H{"Authorized?"}

    H -->|YES| I["⚙️ Execute Tool"]
    H -->|NO| J["🚫 Block Action"]

    I --> K["📝 Audit Event"]
    J --> K

    L["📨 Untrusted Supplier Message"] --> B
    L -.->|"Cannot grant permissions"| J
```

Security policies are centralized in:

```text
data/policies.json
```

External supplier messages are treated as **untrusted data**.

They cannot:

- Grant themselves permissions
- Override security policies
- Execute privileged tools
- Modify authorization rules
- Bypass the security engine

---

# 🧪 Malicious Supplier Demonstration

SupplyShield includes a dedicated security demonstration showing how an untrusted supplier instruction is handled.

```mermaid
flowchart TD

    A["📨 Supplier Message"] --> B["⚠️ Untrusted Input"]

    B --> C["🔐 Security Engine"]

    C --> D["Permission Check"]
    D --> E["Policy Evaluation"]

    E --> F{"Privileged Action<br/>Allowed?"}

    F -->|YES| G["⚙️ Tool Executor"]
    F -->|NO| H["🚫 BLOCKED"]

    H --> I["📝 Security Audit Event"]

    G --> J["📝 Execution Audit Event"]

    K["❌ Supplier cannot<br/>grant permissions"] -.-> H
```

The important property is that the request is stopped **before the privileged executor is reached** when the policy does not permit it.

---

# 📊 Control Room

The React dashboard acts as the operational command center.

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

```mermaid
flowchart LR

    A["🚨 Incident<br/>Detected"]
    B["🚢 Shipment<br/>Investigated"]
    C["📦 Inventory<br/>Risk"]
    D["🚚 Routes<br/>Evaluated"]
    E["🏭 Suppliers<br/>Checked"]
    F["💰 Finance<br/>Validated"]
    G["🧠 Recovery<br/>Generated"]
    H["🛡️ Security<br/>Gate"]
    I["✅ Final<br/>Recovery State"]

    A --> B --> C --> D --> E --> F --> G --> H --> I
```

---

# 🧮 Why Deterministic Tools Matter

SupplyShield deliberately avoids letting the LLM invent operational facts.

```mermaid
flowchart LR

    A["🧠 Agent Reasoning"] --> B["🔧 Deterministic Tool"]

    B --> C["📊 Source Data"]

    C --> D["🧮 Verified Calculation"]

    D --> E["🔎 Agent Interpretation"]

    E --> F["🛡️ Policy Validation"]

    F --> G["📋 Recovery Decision"]
```

This creates a separation between:

**Reasoning → Verification → Governance → Decision**

rather than:

**Prompt → LLM → Action**

---

# 🧰 Technology Stack

## 🤖 AI / Agentic Layer

- Google ADK
- Gemini
- Multi-agent orchestration
- Structured agent outputs
- Agent-specific tool access

## ⚙️ Backend

- Python
- FastAPI
- Deterministic supply-chain tools
- Policy engine
- CSV / JSON source data
- REST APIs

## 🖥️ Frontend

- React
- Vite
- Component-driven dashboard
- API-driven state
- Real-time recovery visualization

## 🐳 Infrastructure

- Docker
- Docker Compose
- Nginx

## 🔐 Governance

- Security engine
- Policy definitions
- Audit events
- Firestore-compatible audit storage
- Local JSONL fallback

---

# 📁 Project Structure

```text
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
```

---

# 🔌 API Surface

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Backend health check |
| `GET` | `/api/dashboard` | Dashboard data |
| `GET` | `/api/agents` | Agent status |
| `GET` | `/api/inventory` | Inventory information |
| `GET` | `/api/inventory/{product_id}/risk` | Inventory risk |
| `GET` | `/api/shipments/delayed` | Delayed shipments |
| `GET` | `/api/shipments/{shipment_id}` | Shipment details |
| `GET` | `/api/shipments/{shipment_id}/risk` | Shipment risk |
| `GET` | `/api/suppliers/product/{product_id}` | Supplier information |
| `GET` | `/api/suppliers/options/{product_id}` | Alternative suppliers |
| `GET` | `/api/routes/best` | Route evaluation |
| `GET` | `/api/finance/policy` | Financial policy |
| `POST` | `/api/finance/check` | Financial validation |
| `POST` | `/api/recovery` | Execute recovery orchestration |
| `GET` | `/api/purchase-orders` | Purchase-order state |
| `POST` | `/api/purchase-orders/proposals` | Generate PO proposal |
| `GET` | `/api/security/events` | Security audit events |
| `GET` | `/api/security/policies` | Active security policies |
| `POST` | `/api/security/evaluate` | Evaluate an action |
| `POST` | `/api/security/demo/supplier-export` | Malicious supplier demonstration |

---

# 📡 Recovery API

### Standard recovery request

```json
{
  "shipment_id": "SHP001"
}
```

### Replan while excluding a disrupted supplier

```json
{
  "shipment_id": "SHP001",
  "exclude_supplier_ids": [
    "SUP002"
  ]
}
```

The backend performs the actual orchestration and returns a structured recovery result to the frontend.

---

# 🧠 Design Principles

### 01 — Deterministic Truth

LLMs are used for reasoning and orchestration.

Critical calculations remain grounded in deterministic tools and source data.

### 02 — No Fabricated Success

If a compliant recovery strategy cannot be found:

```text
NO_FEASIBLE_PLAN
```

is returned.

### 03 — Least Privilege

Agents receive only the capabilities required for their responsibilities.

### 04 — Untrusted Inputs Stay Untrusted

External supplier messages cannot elevate their own permissions.

### 05 — Observable Autonomy

Agent activity and security events are visible and auditable.

### 06 — Human Authorization

The current procurement and shipment tools generate proposals rather than silently modifying external ERP systems.

---

# 🌐 Extensible Enterprise Architecture

SupplyShield uses a replaceable data and tool layer.

The current implementation uses CSV/JSON-backed deterministic tools, while the architecture can evolve toward enterprise systems.

```mermaid
flowchart TB

    A["🧮 Deterministic Tool Interface"]

    A --> B["CSV / JSON"]
    A --> C["PostgreSQL"]
    A --> D["Firestore"]
    A --> E["ERP"]
    A --> F["WMS"]
    A --> G["TMS"]

    B --> H["🛡️ SupplyShield"]
    C --> H
    D --> H
    E --> H
    F --> H
    G --> H

    H --> I["🤖 Agent Layer"]
    H --> J["🔐 Policy Engine"]
    H --> K["📊 Control Room"]

    I --> L["📋 Recovery Proposal"]
    J --> L
    K --> L
```

This allows the agent layer to evolve without requiring a complete rewrite of the decision architecture.

---

# 🧪 Testing

Install development dependencies:

```powershell
pip install -r requirements-dev.txt
```

Run the test suite:

```powershell
pytest -q
```

The test suite covers:

- Deterministic tools
- Security guardrails
- Backend health
- API data contracts
- Agent presence
- Recovery orchestration
- Policy enforcement
- Mocked ADK execution

---

# ⚙️ Local Development

## 1. Clone the repository

```powershell
git clone <YOUR_REPOSITORY_URL>
cd SupplyShield
```

## 2. Create virtual environment

```powershell
python -m venv .venv
.venv\Scripts\activate
```

## 3. Install Python dependencies

```powershell
pip install -r requirements.txt
```

## 4. Configure Gemini

Copy:

```text
.env.example
```

to:

```text
.env
```

Set:

```env
GOOGLE_API_KEY=your_key_here
```

> ⚠️ Never commit `.env` to GitHub.

## 5. Start backend

```powershell
uvicorn backend.main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

API documentation:

```text
http://127.0.0.1:8000/docs
```

## 6. Start frontend

Open another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

# 🐳 Docker Deployment

Set your Gemini API key in the environment and run:

```powershell
docker compose up --build
```

Open:

```text
http://localhost:5173
```

The frontend Nginx container proxies:

```text
/api/*
```

to the FastAPI backend.

---

# 🔭 Roadmap

```mermaid
flowchart LR

    A["🚀 CURRENT"] --> B["🔄 NEXT"] --> C["🌐 VISION"]

    A1["Multi-Agent Recovery"]
    A2["Deterministic Tools"]
    A3["Security Governance"]
    A4["Auditability"]
    A5["Interactive Control Room"]

    B1["Live ERP Integration"]
    B2["Streaming Shipment Events"]
    B3["External Disruption Intelligence"]
    B4["Human Approval Workflows"]
    B5["Persistent Enterprise Memory"]
    B6["Advanced Scenario Simulation"]

    C1["Governed Autonomous<br/>Supply-Chain Resilience"]
    C2["Enterprise-Scale Deployment"]

    A --- A1
    A --- A2
    A --- A3
    A --- A4
    A --- A5

    B --- B1
    B --- B2
    B --- B3
    B --- B4
    B --- B5
    B --- B6

    C --- C1
    C --- C2
```

---

# 📈 From Reactive to Resilient

### Traditional Workflow

```mermaid
flowchart LR

    A["🚨 Disruption"]
    B["🔎 Manual Investigation"]
    C["👥 Multiple Teams"]
    D["📑 Fragmented Decisions"]
    E["⏳ Delayed Response"]

    A --> B --> C --> D --> E
```

### SupplyShield Workflow

```mermaid
flowchart LR

    A["🚨 Disruption"]
    B["🤖 Multi-Agent Investigation"]
    C["🧮 Deterministic Verification"]
    D["⚠️ Risk Evaluation"]
    E["🛡️ Policy Validation"]
    F["📋 Recovery Proposal"]
    G["👤 Human Oversight"]
    H["✅ Governed Recovery"]

    A --> B --> C --> D --> E --> F --> G --> H
```

---

# 🏆 Why SupplyShield?

SupplyShield is built around a fundamental distinction:

> **An AI system should not simply generate an answer. It should investigate, verify, respect constraints, explain its decision, and fail safely when no valid answer exists.**

That is why SupplyShield combines:

```mermaid
flowchart LR

    A["🧠 AI Reasoning"] --> F["🛡️ Trustworthy Recovery"]
    B["🧮 Deterministic Tools"] --> F
    C["🔐 Security Governance"] --> F
    D["🔍 Auditability"] --> F
    E["👤 Human Oversight"] --> F
```

---

# 🎯 What Makes SupplyShield Different?

| Conventional AI Workflow | SupplyShield |
|---|---|
| Single general-purpose agent | Specialized multi-agent architecture |
| LLM-generated facts | Deterministic source-of-truth tools |
| Actions may be loosely controlled | Policy-gated execution |
| External instructions may influence behavior | Untrusted inputs remain untrusted |
| Success-oriented responses | Explicit `NO_FEASIBLE_PLAN` state |
| Limited observability | Auditable security and recovery events |
| Static UI | Backend-driven operational control room |
| AI-only decision | AI + deterministic verification + governance |

---

# 🌍 Enterprise Vision

SupplyShield is designed as a foundation for **governed AI-driven operational resilience**.

```mermaid
flowchart TD

    A["🌐 Real-World Supply Chain"] --> B["📡 Operational Signals"]

    B --> C["🧠 Multi-Agent Intelligence"]

    C --> D["🧮 Deterministic Verification"]

    D --> E["⚠️ Risk & Impact Analysis"]

    E --> F["🔐 Governance Layer"]

    F --> G["📋 Recovery Proposal"]

    G --> H["👤 Human Authorization"]

    H --> I["⚙️ Enterprise Execution"]

    I --> J["🔍 Continuous Audit"]

    J -.-> C
```

The long-term objective is not simply to build another AI dashboard.

It is to create a **governed operational intelligence layer** that can sit between real-world supply-chain signals and enterprise decision-making systems.

---

# 👥 Team TWOPOINTERS

| Team Member | Role |
|---|---|
| **Tejaswee Rajput** | Team Lead |
| **Rahul Sharma** | Team Member |
| **Sohana Pilli** | Team Member |
| **Shreya Dubey** | Team Member |

## SupplyShield

**Track:** Smart Health & Supply Chain Resilience

### Built with

- 🤖 Agentic AI
- 🧠 Multi-Agent Systems
- ⚙️ Deterministic Decision Tools
- 🛡️ Security Governance
- 📊 Data-Driven Operations
- 🌐 Full-Stack Engineering

---

# 🏁 Submission

## Build with AI: Code for Communities — Second Edition

**Hack2Skill**

🔗 https://hack2skill.com/event/codeforcommunities2/

SupplyShield is submitted as a software-first solution focused on:

> **Smart Health & Supply Chain Resilience**

The platform combines:

**Google ADK + Gemini + Multi-Agent Systems + Deterministic Decision Tools + Security Governance + React + FastAPI**

---

# 📜 License

SupplyShield is released under the **MIT License**, permitting free use, modification, distribution, and private or commercial use, subject to the terms of the license.


---

<div align="center">

# 🛡️ SUPPLYSHIELD:-FROM DISRUPTION SIGNAL
TO VERIFIED RECOVERY

### Detect. Reason. Verify. Recover.

**Team TWOPOINTERS**

<br/>

*Autonomous supply-chain resilience, built with governed AI.*

</div>
