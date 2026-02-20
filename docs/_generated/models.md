# Data Model Inventory

> **Auto-generated** — Do not edit manually.
> Run `npm run gen:models` to regenerate.
> Generated: 2026-02-20

## Overview

This project uses **JSON file-based storage** (no database). All data files live in the `data/` directory and are auto-created by `ensureDataFiles()` in server.js.

| Data File | Default Type | Live Record Count |
|-----------|-------------|-------------------|
| profile.json | Object | N/A |
| jobs.json | Array | 0 |
| resumes.json | Array | 0 |
| cover-letters.json | Array | 0 |
| writing-samples.json | Array | 0 |
| document-templates.json | Array | 0 |
| contacts.json | Array | 0 |
| mock-interviews.json | Array | 0 |
| custom-boards.json | Array | 0 |

---

## Profile

**File:** `data/profile.json`  
**Type:** Single object  

| Field | Type | Default |
|-------|------|---------|
| name | string | "" |
| email | string | "" |
| phone | string | "" |
| location | string | "" |
| summary | string | "" |
| skills | array | [] |
| experience | array | [] |
| education | array | [] |
| certifications | array | [] |
| links | array | [] |

## Jobs

**File:** `data/jobs.json`  
**Type:** Array of records  

*Empty by default. Schema inferred from code usage.*

## Resumes

**File:** `data/resumes.json`  
**Type:** Array of records  

*Empty by default. Schema inferred from code usage.*

## Cover Letters

**File:** `data/cover-letters.json`  
**Type:** Array of records  

*Empty by default. Schema inferred from code usage.*

## Writing Samples

**File:** `data/writing-samples.json`  
**Type:** Array of records  

*Empty by default. Schema inferred from code usage.*

## Document Templates

**File:** `data/document-templates.json`  
**Type:** Array of records  

*Empty by default. Schema inferred from code usage.*

## Contacts

**File:** `data/contacts.json`  
**Type:** Array of records  

*Empty by default. Schema inferred from code usage.*

## Mock Interviews

**File:** `data/mock-interviews.json`  
**Type:** Array of records  

*Empty by default. Schema inferred from code usage.*

## Custom Boards

**File:** `data/custom-boards.json`  
**Type:** Array of records  

*Empty by default. Schema inferred from code usage.*

