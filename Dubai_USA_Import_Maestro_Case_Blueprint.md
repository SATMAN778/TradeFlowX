# Dubai → USA Import: UiPath Maestro Case App Blueprint

**Direction**: UAE (Dubai / JAFZA) → USA  
**Role**: US Importer of Record  
**Orchestrator**: UiPath Maestro  
**Automation mix**: RPA (UiPath attended/unattended) + AI Agents (LLM-based) + Integrations (ACE, OFAC API, CBP, ERP)

---

## Case App: Dubai-USA Import Trade Flow

### Case Fields (top-level, visible across all stages)

| Field | Type | Source |
|---|---|---|
| Case ID | Auto-generated | Maestro |
| Shipment reference | Text | T1.1 |
| Supplier name (UAE) | Text | T1.1 |
| Importer of record | Text | T1.1 |
| Country of origin (declared) | Dropdown | T1.3 |
| Country of origin (true / verified) | Dropdown | T3.5 |
| Port of loading | Text | T1.1 (Dubai / Jebel Ali) |
| Port of entry (USA) | Dropdown | T1.1 |
| HTS code | Text | T3.2 |
| Shipment value (USD) | Currency | T1.2 |
| Entry type | Dropdown | T6.1 (01 / 11) |
| ISF filing status | Status badge | T2.3 |
| OFAC screening result | Status badge | T5.6 |
| CBP release status | Status badge | T6.5 |
| Case status | Status badge | Maestro auto |
| Assigned broker | Text | T1.4 |
| ERP PO number | Text | T1.1 |

---

## Stage 1 — Trade Order Intake and Shipment Creation

**Trigger**: New PO received from UAE supplier (ERP event / email / EDI / portal webhook)  
**Automation type**: Integration + RPA  
**Maestro action**: Create new case, assign case ID, trigger Stage 2 immediately

### Tasks

**T1.1 — Capture purchase order data**
- Source: ERP system (SAP / Oracle / NetSuite) or email/EDI
- Fields to extract: PO number, supplier name, supplier address (UAE), goods description, quantity, unit price, total value (USD), Incoterms, expected ship date, port of loading, port of entry
- Automation: Integration connector (ERP API) or RPA screen scrape + email extraction
- Output: Populated case fields in Maestro
- Validation rule: All mandatory fields present → proceed; missing fields → human task "Complete PO data"

**T1.2 — Validate shipment data**
- Check: Total value above $2,500 → formal entry (Type 01); below → informal (Type 11)
- Check: Importer of record has valid CBP bond on file
- Check: Notify party and consignee populated
- Automation: Rule engine / decision activity in Maestro
- Output: Entry type set in case header; bond alert if missing

**T1.3 — Confirm and flag country of origin**
- Logic: If supplier address is in JAFZA or UAE Free Zone → flag "potential transshipment — verify true COO"
- Logic: If certificate of origin attached → extract and record COO
- Automation: AI agent reads supplier address + any attached COO certificate
- Output: COO (declared) field set; transshipment flag raised if applicable
- Human task trigger: If transshipment flag = true → "Verify true country of origin with supplier"

**T1.4 — Assign Maestro case ID and notify stakeholders**
- Create Maestro case with all Stage 1 fields
- Assign to customs broker queue
- Send notification to: importer ops team, customs broker
- Trigger: Stage 2 (ISF) immediately — do not wait
- Automation: Maestro case creation + email/Slack integration

---

## Stage 2 — ISF 10+2 Filing (Pre-Departure — Time Critical)

**Trigger**: Case created in Stage 1  
**Deadline**: Must file 24 hours before vessel loads at Jebel Ali / Dubai port  
**Automation type**: Integration (ACE API) + RPA fallback  
**Maestro action**: SLA timer set for 24-hr deadline; escalate if breached

### ISF 10 Importer Elements (you are responsible for all 10)

**T2.1 — Collect and validate the 10 importer data elements**

| ISF Element | Source | Automation |
|---|---|---|
| 1. Seller name and address | Supplier record / PO | ERP API |
| 2. Buyer name and address | Importer master data | ERP API |
| 3. Importer of record number | CBP bond / EIN | Master data lookup |
| 4. Consignee number | CBP importer number | Master data lookup |
| 5. Manufacturer / supplier name and address | Supplier record | ERP / supplier portal |
| 6. Ship-to party name and address | Delivery record | ERP API |
| 7. Country of origin | COO field from T1.3 | Auto-populated |
| 8. HTS-6 (Schedule B first 6 digits) | From T3 or preliminary HTS | AI agent pre-fill |
| 9. Container stuffing location | Freight forwarder notification | Email extraction / portal |
| 10. Consolidator name and address | Freight forwarder notification | Email extraction / portal |

- Validation: All 10 elements present and non-null → proceed to T2.3
- Missing elements → human task "Collect missing ISF elements" assigned to broker

**T2.2 — Collect carrier +2 elements (carrier responsibility — monitor only)**
- Element 11: Vessel stow plan (carrier submits)
- Element 12: Container status messages (carrier submits)
- Automation: Monitor ACE for carrier submission; alert if not received 48 hrs pre-arrival
- Output: ISF completeness flag updated in case

**T2.3 — File ISF in ACE (CBP)**
- Transmit all 10 elements to CBP via ACE ISF portal or ACE API
- Automation: Integration bot → ACE API; RPA fallback if ACE API unavailable
- Output: ISF transaction number stored in case; timestamp recorded
- SLA: Must complete before vessel departure from Dubai
- Error handling: ACE rejection → parse error code → human task "Correct ISF submission"

**T2.4 — Monitor ISF response from CBP**
- Poll ACE for ISF match response
- Response types:
  - Match: proceed, update case status to "ISF Filed — Matched"
  - No match: update case, alert broker, attempt correction
  - Do not load: immediate escalation → human task "ISF Do Not Load — urgent action required"
- Automation: Polling bot (every 2 hrs) + webhook if ACE supports it
- Output: ISF status badge updated in case header

**T2.5 — Update ISF on bill of lading receipt**
- When B/L received from freight forwarder: verify B/L number, vessel name, voyage number, container numbers match ISF filing
- If discrepancy: amend ISF in ACE within 24 hrs of discovery
- Automation: Email bot extracts B/L data; comparison rule checks against ISF record; auto-amend if minor field only
- Human task trigger: Material discrepancy (different goods, different supplier) → "Amend ISF — material change"

---

## Stage 3 — HTS Classification and Duty Determination

**Trigger**: Parallel with Stage 2 (start at case creation); ISF needs HTS-6 minimum  
**Automation type**: AI Agent (LLM + tariff database) + human review queue  
**Maestro action**: Confidence threshold gate; route to human or auto-approve

### Tasks

**T3.1 — Extract product description from commercial invoice**
- Source: Commercial invoice (PDF attachment or ERP item master)
- Extract: Product name, technical specifications, material composition, end use, model number
- Automation: IDP (UiPath Document Understanding) for PDF invoices; ERP API for structured data
- Output: Product description record attached to case

**T3.2 — AI-assisted HTS code lookup**
- AI agent queries USITC Harmonized Tariff Schedule and CBP CROSS rulings database
- Input: Product description from T3.1 + country of origin
- Output: Top 3 HTS candidates with confidence scores and ruling citations
- Automation: AI agent with tool calls to USITC API and CBP CROSS
- Output: HTS candidates list in case; top candidate pre-selected

**T3.3 — Confidence score gate**
- If confidence score > 90%: auto-approve HTS code, proceed to T3.4
- If confidence score 70–90%: flag for broker review → human task "Review and confirm HTS code"
- If confidence score < 70%: mandatory human classification → human task "Manual HTS classification required"
- Automation: Maestro condition activity
- SLA: Human review must complete within 4 business hours

**T3.4 — Validate duty rate for confirmed HTS**
- Look up: MFN (most favored nation) duty rate for HTS code
- Look up: Whether HTS code is subject to Section 301 tariffs (China-origin goods)
- Look up: Whether ADD or CVD orders exist for this HTS + COO combination
- Automation: AI agent queries CBP, USITC, Commerce Department ADD/CVD database
- Output: Duty rate record: MFN rate + Section 301 surcharge (if applicable) + ADD/CVD rate (if applicable)

**T3.5 — Transshipment and true COO verification**
- Logic: If COO declared = UAE AND supplier is in JAFZA or free zone → run transshipment check
- Check: Is there a valid UAE certificate of origin (Form A or UAE COO) showing substantial transformation in UAE?
- Check: Does product description match goods typically manufactured in UAE?
- AI agent: Cross-reference supplier against known UAE manufacturers vs. trading companies
- Human task trigger: If substantial transformation cannot be confirmed → "Obtain COO documentation from supplier"
- Risk flag: If true COO appears to be China → Section 301 tariffs apply; if India → standard MFN only
- Output: True COO verified and recorded in case header

**T3.6 — Flag PGA trigger HTS codes**
- Check HTS code against CBP PGA flag database
- If PGA flag exists → trigger Stage 4 in parallel
- If no PGA flag → Stage 4 skipped; proceed to Stage 5
- Automation: Lookup table / API call to CBP PGA indicator file
- Output: PGA required flag (yes/no) + list of triggered agencies stored in case

---

## Stage 4 — PGA Screening (Conditional — Only If Stage 3 Flags)

**Trigger**: PGA flag = true from T3.6  
**Automation type**: Integration + RPA + human tasks  
**Maestro action**: Parallel sub-cases per agency if multiple PGAs triggered

### Tasks

**T4.1 — Identify applicable PGA agencies**
- Map HTS code to PGA agency list
- Common agencies for UAE-origin goods:
  - FDA: food, cosmetics, medical devices, drugs, radiation-emitting electronics
  - USDA APHIS: plants, plant products, wood packaging
  - USDA FSIS: meat and poultry (rare for UAE but possible re-exports)
  - EPA: chemicals, pesticides, vehicles, engines
  - CPSC: consumer products, children's products
  - FCC: electronics, wireless devices, radio frequency equipment
  - DOT / NHTSA: vehicles, tires, auto parts
- Output: Agency list attached to case; one sub-task per agency

**T4.2 — Retrieve permit, license, and certification requirements**
- Per agency: query requirement database for HTS + COO combination
- FDA: check if product is on FDA Prior Notice requirement list
- USDA: check phytosanitary certificate requirement
- FCC: check FCC ID requirement and equipment authorization
- Automation: Web scraping agent or API integration per agency portal
- Output: Requirements checklist per agency stored in case

**T4.3 — Submit PGA data in ACE**
- Transmit PGA message sets to CBP/ACE for each triggered agency
- Include: HTS code, COO, product description, permit numbers, certification numbers
- Automation: ACE API integration or RPA into ACE portal
- Output: ACE submission confirmation per agency; timestamps recorded

**T4.4 — Monitor PGA hold or release per agency**
- Poll ACE for PGA agency response
- Response types:
  - May Proceed: update agency status to cleared
  - May Examine: alert broker; coordinate physical examination
  - May Hold: immediate human task → "PGA Hold — [Agency Name] — action required"
  - Refuse: immediate escalation → "PGA Refusal — shipment cannot enter"
- SLA: Check every 4 hours; escalate if no response within 48 hrs of arrival
- Output: PGA disposition per agency recorded in case; overall PGA status badge updated

---

## Stage 5 — OFAC and Denied-Party Screening

**Trigger**: Runs in parallel with Stages 3 and 4 from case creation  
**Automation type**: Integration (OFAC API, screening service API)  
**Maestro action**: Hard block if OFAC hit confirmed; human task if fuzzy match

### Tasks

**T5.1 — Extract all trade parties**
- Parties to screen: UAE supplier, freight forwarder, customs broker (UAE side), shipping line, notify party, bank / letter of credit issuing bank, beneficial owner (if known)
- Extract from: PO, commercial invoice, B/L, letter of credit
- Automation: IDP extraction from documents + ERP API for known parties
- Output: Party list with name, address, country, role attached to case

**T5.2 — OFAC SDN list API search**
- Call OFAC SDN API (ofac.treasury.gov) for each party
- Also check: Consolidated Sanctions List, non-SDN programs relevant to UAE (Iran, Syria, Russia transshipment risk)
- Automation: Integration bot → OFAC API; run for all parties in parallel
- Output: Match result per party (no match / potential match / confirmed match)

**T5.3 — Denied-party list check**
- Check each party against:
  - BIS Entity List (export.gov)
  - BIS Denied Persons List
  - State Department AECA Debarred List
  - SAM.gov (EPLS / excluded parties)
- Automation: Integration bot; commercial screening service API (e.g., Descartes, Amber Road) if available
- Output: DPL result per party recorded in case

**T5.4 — Fuzzy-match scoring and triage**
- Fuzzy match threshold: configurable (default 85% similarity)
- If score < threshold: auto-clear party, log result
- If score >= threshold and < 100%: human task "Review potential screening match — [Party Name]"
- If exact match (100%): immediate case block → "Confirmed OFAC / DPL hit — do not proceed"
- Automation: Maestro condition + scoring algorithm
- Human task SLA: 2 business hours for review

**T5.5 — UAE transshipment-specific screening**
- If true COO from T3.5 is a third country (e.g., China, India, Iran): screen manufacturer and original exporter from that country as well
- If UAE freight forwarder is flagged as known Iran / Russia transshipment intermediary: escalate
- Automation: AI agent cross-references freight forwarder against CBP transshipment watchlist and news intelligence
- Output: Transshipment risk score recorded in case

**T5.6 — Log and store screening record**
- Record: all parties screened, list versions checked (with date/version), results, reviewer name (if human review), final decision
- Decision outcomes: Clear (proceed) / Hold (pending review) / Block (stop shipment)
- Output: OFAC screening status badge updated in case header; record archived to DMS
- Compliance note: Retain screening records for 5 years per CBP and OFAC requirements

---

## Stage 6 — Customs Entry Filing and CBP Clearance

**Trigger**: ISF filed (Stage 2 complete) + HTS confirmed (Stage 3 complete) + OFAC clear (Stage 5 clear)  
**Automation type**: RPA + Integration (ACE) + human tasks  
**Maestro action**: Gate check — all three upstream stages must be green before Stage 6 opens

### Tasks

**T6.1 — Determine and set entry type**
- Type 01 (Formal Consumption Entry): shipment value > $2,500 — requires CBP bond
- Type 11 (Informal Entry): shipment value $801–$2,500
- Type 86 (Section 321 Entry): shipment value < $800 (de minimis) — duties and taxes waived
- Automation: Rule based on shipment value from case header
- Output: Entry type set in case; bond number confirmed for Type 01

**T6.2 — Prepare CBP Form 3461 (Entry / Immediate Delivery)**
- Fields: Importer of record, consignee, entry type, port of entry, HTS codes, description, value, COO, vessel/flight, B/L number, container numbers
- Automation: RPA populates form from case fields; PDF generation
- Output: Completed CBP 3461 attached to case

**T6.3 — Calculate all duties and fees**
- MFN duty = Declared value × MFN rate (from T3.4)
- Section 301 surcharge = Declared value × surcharge rate (if China-origin goods identified in T3.5)
- ADD / CVD = Per-unit or ad valorem rate from Commerce Department order (if applicable)
- Merchandise Processing Fee (MPF) = 0.3464% of value (min $31.67, max $614.35 as of current rates)
- Harbor Maintenance Fee (HMF) = 0.125% of value (ocean shipments only)
- Automation: Calculation bot using confirmed HTS + COO + value from case
- Output: Duty calculation summary attached to case; total landed cost updated in ERP

**T6.4 — File entry in ACE via broker**
- Transmit CBP 3461 and supporting data to ACE
- Method: ACE API integration (preferred) or RPA into broker's filing system
- Attach: Commercial invoice, packing list, B/L, COO certificate, any PGA permits
- Automation: Integration or RPA bot
- Output: Entry number assigned by CBP; stored in case

**T6.5 — Monitor CBP exam status**
- Poll ACE entry status after filing
- Status types:
  - Released (green): update case; trigger Stage 7
  - Exam selected (X-ray / CET / intensive): human task "CBP exam selected — coordinate with port agent"
  - Hold — CBP query: await CF-28 or CF-29
  - Seizure: immediate legal escalation
- Automation: Polling bot every 2 hours; webhook integration if supported
- Output: CBP release status badge updated in case header

**T6.6 — Handle CBP queries and post-entry actions**
- CF-28 (Request for Information): extract questions from ACE; auto-populate answers from case data where possible; human task for unanswered questions; respond within 30 days
- CF-29 (Notice of Action — duty rate change): review with broker; determine protest eligibility; human task "Review CBP action — protest deadline tracking"
- Entry summary (CBP 7501): file within 10 working days of entry
- Automation: Template-based response bot for CF-28; rule engine for CF-29 classification
- Output: All CBP correspondence logged in case timeline

---

## Stage 7 — Document Management and Post-Entry Reconciliation

**Trigger**: CBP release received (T6.5 status = Released)  
**Automation type**: IDP + RPA + Integration (ERP, DMS)  
**Maestro action**: Final stage; close case on T7.7 completion

### Tasks

**T7.1 — Collect and index all trade documents**
- Documents required:
  - Commercial invoice (original)
  - Packing list
  - Bill of lading (OBL or telex release)
  - Certificate of origin (UAE Chamber of Commerce issued)
  - ISF filing confirmation (from T2.3)
  - PGA permits and releases (from Stage 4, if applicable)
  - OFAC screening record (from T5.6)
  - CBP entry summary (CBP 7501)
  - Arrival notice from freight forwarder
- Automation: Email bot collects attachments; IDP classifies document type
- Output: All documents indexed and attached to case

**T7.2 — IDP extraction and cross-document validation**
- Extract from CI: value, quantity, unit price, supplier, HTS description
- Extract from B/L: container numbers, vessel, voyage, weight
- Extract from packing list: quantity, weight, marks and numbers
- Cross-validate: CI value vs. entry value; B/L weight vs. packing list weight; COO on CI vs. COO on case
- Automation: UiPath Document Understanding pipeline
- Human task trigger: Discrepancy found → "Document discrepancy — review and correct"
- Output: Validated document data stored in case; discrepancy report if applicable

**T7.3 — Archive to document management system**
- Archive all documents to DMS (SharePoint / OneDrive / ECM system)
- Tag with: Case ID, shipment reference, HTS code, entry number, importer name, archive date
- Retention rule: 5 years minimum (CBP requirement); 7 years recommended for ADD/CVD entries
- Automation: DMS API integration or RPA upload bot
- Output: DMS link stored in case; archive confirmation timestamp

**T7.4 — Reconcile landed costs in ERP**
- Post: Duty amount, MPF, HMF, ADD/CVD (if any) to ERP accounts payable / GL
- Reconcile: Estimated duties (from T6.3) vs. actual duties assessed by CBP on CBP 7501
- If variance > configured threshold: human task "Duty variance review — [amount]"
- Automation: ERP API integration (SAP BAPI / Oracle API / NetSuite API)
- Output: Landed cost record updated in ERP; case financials finalized

**T7.5 — Duty drawback and first-sale assessment**
- No US-UAE FTA: preferential duty rates not available
- Check: Is goods for manufacturing (manufacturing drawback opportunity)?
- Check: Is goods subsequently exported (unused merchandise drawback)?
- Check: First-sale valuation — if goods transited Dubai, first sale (manufacturer) price may be lower than invoice price → duty savings opportunity
- Automation: Rule engine checks re-export plans and manufacturing intent from case data
- Human task trigger if opportunity identified: "Duty savings opportunity identified — review with trade counsel"
- Output: Drawback opportunity flag and notes in case

**T7.6 — ISF and C-TPAT compliance audit trail**
- Verify ISF was filed on time (>24 hrs before vessel loading)
- Verify all 10 ISF elements were accurate at time of filing
- Record: Any ISF amendments and reasons
- C-TPAT: If importer is C-TPAT certified, record shipment against C-TPAT supply chain security profile
- Automation: Rule engine compares ISF timestamps and amendment log from Stage 2
- Output: Compliance scorecard for this shipment stored in case; feeds KPI dashboard

**T7.7 — Close Maestro case and trigger ERP posting**
- Final checklist before close:
  - CBP release = confirmed
  - All documents archived
  - OFAC record retained
  - Duties reconciled in ERP
  - No open human tasks
- Automation: Maestro case close activity
- Trigger: ERP goods receipt posting; AP invoice for customs broker fees
- Notification: Send case summary to importer ops team and compliance manager
- Output: Case status = Closed; case summary report generated

---

## Maestro Orchestration Design Notes

### Parallel execution map

Stage 2 (ISF) starts immediately at case creation — do not wait for HTS.  
Stage 3 (HTS) starts immediately at case creation — run in parallel with Stage 2.  
Stage 5 (OFAC) starts immediately at case creation — run in parallel with Stages 2 and 3.  
Stage 4 (PGA) starts only if Stage 3 sets PGA flag = true — conditional parallel branch.  
Stage 6 (Customs Entry) is the merge point — waits for Stage 2 + Stage 3 + Stage 5 all green.  
Stage 7 (Post-entry) triggers on CBP release from Stage 6.

### Human task summary (all Maestro human task activities)

| Task ID | Stage | Trigger | Assignee | SLA |
|---|---|---|---|---|
| HT-01 | S1 | Missing PO fields | Ops team | 2 hrs |
| HT-02 | S1 | Transshipment flag — verify COO | Compliance | 4 hrs |
| HT-03 | S2 | Missing ISF elements | Broker | 4 hrs (before deadline) |
| HT-04 | S2 | ISF do not load | Broker + Legal | Immediate |
| HT-05 | S2 | ISF material amendment | Broker | 2 hrs |
| HT-06 | S3 | HTS confidence 70–90% | Broker | 4 hrs |
| HT-07 | S3 | HTS confidence < 70% | Classification specialist | 8 hrs |
| HT-08 | S3 | COO documentation required | Supplier mgmt | 24 hrs |
| HT-09 | S4 | PGA May Hold | Broker | 4 hrs |
| HT-10 | S4 | PGA Refusal | Compliance + Legal | Immediate |
| HT-11 | S5 | OFAC fuzzy match (>=85%) | Compliance | 2 hrs |
| HT-12 | S5 | Confirmed OFAC/DPL hit | Legal + Management | Immediate |
| HT-13 | S6 | CBP exam selected | Port agent | 4 hrs |
| HT-14 | S6 | CF-28 unanswered questions | Broker + Ops | 5 days |
| HT-15 | S6 | CF-29 / CBP action | Broker + Legal | 2 days |
| HT-16 | S7 | Document discrepancy | Ops | 4 hrs |
| HT-17 | S7 | Duty variance | Finance | 2 days |
| HT-18 | S7 | Duty savings opportunity | Trade counsel | 5 days |

### Automation type per stage

| Stage | RPA bot | AI agent | Integration | Human task |
|---|---|---|---|---|
| S1 Order intake | ERP scrape / email extraction | COO flag logic | ERP API | Missing fields, COO flag |
| S2 ISF filing | ACE portal (fallback) | B/L extraction | ACE API, ERP API | Missing elements, DNL |
| S3 HTS classification | — | LLM HTS lookup + CROSS ruling | USITC API, CBP API | Review + manual classify |
| S4 PGA screening | ACE portal submission | Agency requirement lookup | ACE API, agency portals | Hold, refusal |
| S5 OFAC screening | — | Transshipment intelligence | OFAC API, BIS API, SAM API | Fuzzy match, OFAC hit |
| S6 Customs entry | Form population, broker system | — | ACE API, broker API, ERP API | Exam, CF-28, CF-29 |
| S7 Post-entry | DMS upload, ERP posting | Document cross-validation | DMS API, ERP API | Discrepancy, variance |

### Key SLA timers in Maestro

- ISF filing: must complete within [vessel departure - 24 hrs]; Maestro SLA timer starts at T1.4
- OFAC fuzzy match review: 2 business hours
- HTS human review: 4 business hours
- CBP exam coordination: 4 business hours from exam notification
- CF-28 response: 30 calendar days (CBP statutory); internal SLA 5 business days
- Entry summary filing (CBP 7501): 10 working days from entry

### Data integrations required

| System | Integration method | Used in stages |
|---|---|---|
| ERP (SAP / Oracle / NetSuite) | API (REST / BAPI) | S1, S6, S7 |
| CBP ACE | API + RPA fallback | S2, S3, S4, S6 |
| USITC tariff database | REST API | S3 |
| CBP CROSS ruling database | Web scrape / API | S3 |
| Commerce Dept ADD/CVD database | Web scrape | S3 |
| OFAC SDN API | REST API | S5 |
| BIS Entity List / DPL | REST API or file sync | S5 |
| SAM.gov (EPLS) | REST API | S5 |
| Document management system | API (SharePoint / ECM) | S7 |
| Customs broker TMS | API or RPA | S6 |
| Email (Outlook / Gmail) | Integration connector | S1, S2, S7 |

---

*Blueprint version: Dubai-USA import, UiPath Maestro, June 2025*  
*Applies to: US importer of record role only. UAE exporter obligations (EEI, export license) are out of scope.*
