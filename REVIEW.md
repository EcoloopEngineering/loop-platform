# Code Review Guidelines — Loop Platform

## Always Check
- New API endpoints have `@Roles()` decorator and are tested
- Services use repository ports, NOT PrismaService directly
- New listeners are thin (delegate to services)
- Frontend components use `<script setup lang="ts">` with typed props
- No `any` types in TypeScript
- Error handling present (try/catch in stores, services)
- Pipeline automation: task templates have correct `nextStage` and conditions
- Database migrations are backward-compatible

## Security
- No credentials or API keys in code
- Rate limiting on auth endpoints
- Input validation via DTOs with class-validator
- RBAC enforced on all endpoints

## Performance
- No N+1 queries in repositories
- Pagination on list endpoints
- Cache invalidation when data changes

## Skip
- SCSS/CSS style preferences
- Import ordering
- Comment style
- Generated files
