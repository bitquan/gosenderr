# @gosenderr/contracts

Shared canonical contracts for Senderr systems.

## Scope

- Job lifecycle enums and transitions
- Job model and payment/proof fields
- Courier profile model
- Courier rate card models
- Command metadata and command result contracts

## Usage

```ts
import {
  JobStatus,
  canTransitionJobStatus,
  JobStatusCommandResult,
} from '@gosenderr/contracts';
```

## Commands

```bash
pnpm --filter @gosenderr/contracts build
pnpm --filter @gosenderr/contracts type-check
```
