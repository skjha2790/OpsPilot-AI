# Contributing to OpsPilot AI

Thanks for helping improve OpsPilot AI.

## Guidelines

- Keep changes scoped to the requested milestone.
- Do not modify application behavior unless the task explicitly requires it.
- Preserve the FastAPI contract and the React dashboard unless instructed otherwise.
- Prefer small, reviewable changes.
- Use the existing architecture and folder conventions.

## Development Workflow

1. Create a branch.
2. Make the requested change.
3. Validate locally.
4. Submit the change without committing unless asked.

## Validation Checklist

- Backend compiles.
- Frontend builds.
- Docker, Helm, and Terraform files remain consistent.
- Documentation links work.
- CI runs without requiring secrets.

## Environment Files

- Copy `backend/.env.example` to `backend/.env`.
- Copy `frontend/.env.example` to `frontend/.env`.
- Do not commit secrets.

