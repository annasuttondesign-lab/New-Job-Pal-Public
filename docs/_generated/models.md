# Data Model Inventory

> **Auto-generated** — Do not edit manually.
> Run `npm run gen:models` to regenerate.
> Generated: 2026-02-19

## Overview

This project uses **JSON file-based storage** (no database). All data files live in the `data/` directory and are auto-created by `ensureDataFiles()` in server.js.

| Data File | Default Type | Live Record Count |
|-----------|-------------|-------------------|
| profile.json | Object | N/A |
| jobs.json | Array | 9 |
| resumes.json | Array | 4 |
| cover-letters.json | Array | 3 |
| writing-samples.json | Array | 2 |
| document-templates.json | Array | 2 |
| contacts.json | Array | 0 |
| mock-interviews.json | Array | 1 |
| custom-boards.json | Array | 1 |

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

| Field | Type | Notes |
|-------|------|-------|
| id | string (UUID) |  |
| title | string |  |
| company | string |  |
| location | string |  |
| type | string |  |
| url | string |  |
| description | string |  |
| createdAt | string (date) |  |
| updatedAt | string (date) |  |
| notes | string |  |

## Resumes

**File:** `data/resumes.json`  
**Type:** Array of records  

| Field | Type | Notes |
|-------|------|-------|
| id | string (UUID) |  |
| jobId | string (UUID) |  |
| jobTitle | string |  |
| company | string |  |
| resume | string |  |
| changes | array of strings |  |
| highlights | array of strings |  |
| atsKeywords | array of strings |  |
| createdAt | string (date) |  |
| updatedAt | string (date) |  |

## Cover Letters

**File:** `data/cover-letters.json`  
**Type:** Array of records  

| Field | Type | Notes |
|-------|------|-------|
| id | string (UUID) |  |
| jobId | string (UUID) |  |
| jobTitle | string |  |
| company | string |  |
| coverLetter | string |  |
| toneNotes | string |  |
| keyPoints | array of strings |  |
| createdAt | string (date) |  |
| updatedAt | string (date) |  |

## Writing Samples

**File:** `data/writing-samples.json`  
**Type:** Array of records  

| Field | Type | Notes |
|-------|------|-------|
| id | string (UUID) |  |
| title | string |  |
| content | string |  |
| type | string |  |
| createdAt | string (date) |  |

## Document Templates

**File:** `data/document-templates.json`  
**Type:** Array of records  

| Field | Type | Notes |
|-------|------|-------|
| id | string (UUID) |  |
| type | string |  |
| originalName | string |  |
| filename | string |  |
| placeholders | array of strings |  |
| uploadedAt | string (date) |  |

## Contacts

**File:** `data/contacts.json`  
**Type:** Array of records  

*Empty by default. Schema inferred from code usage.*

## Mock Interviews

**File:** `data/mock-interviews.json`  
**Type:** Array of records  

| Field | Type | Notes |
|-------|------|-------|
| id | string (UUID) |  |
| jobId | string (UUID) |  |
| messages | array of objects | Fields: role, content, questionType, tip |
| questionCount | number |  |
| feedback | object |  |
| createdAt | string (date) |  |
| completedAt | string (date) |  |

## Custom Boards

**File:** `data/custom-boards.json`  
**Type:** Array of records  

| Field | Type | Notes |
|-------|------|-------|
| id | string (UUID) |  |
| name | string |  |
| url | string |  |
| description | string |  |
| createdAt | string (date) |  |

