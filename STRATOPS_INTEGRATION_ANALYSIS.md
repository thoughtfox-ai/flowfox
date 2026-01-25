# StratOps ↔ FlowFox Integration: Dependency Analysis

## 🚨 CRITICAL ISSUES (Breaking Changes Required)

### 1. **Next.js Version Mismatch** ⚠️ HIGH PRIORITY
| Package | StratOps | FlowFox | Issue |
|---------|----------|---------|-------|
| `next` | **15.5.9** | **16.1.4** | Major version difference |
| `eslint-config-next` | 15.5.9 | 16.1.4 | Must match Next.js version |

**Impact:**
- Next.js 16 introduced breaking changes to App Router
- Different server component behaviors
- Potential middleware incompatibilities
- Build pipeline differences

**Resolution Required:**
```bash
# Option A: Upgrade StratOps to Next.js 16 (RECOMMENDED)
npm install next@16.1.4 eslint-config-next@16.1.4

# Option B: Downgrade FlowFox to Next.js 15 (NOT RECOMMENDED - lose features)
# Not advised - FlowFox uses Next.js 16 features
```

---

### 2. **NextAuth Version Conflict** 🔴 CRITICAL
| Package | StratOps | FlowFox | Issue |
|---------|----------|---------|-------|
| `next-auth` | **4.24.7** (stable) | **5.0.0-beta.30** (beta) | Completely incompatible APIs |

**Impact:**
- **BREAKING**: NextAuth v5 has completely different API from v4
- Session handling is different
- Middleware signature changed
- JWT handling redesigned
- Cannot run both versions simultaneously

**Breaking Changes in v5:**
```javascript
// NextAuth v4 (StratOps current)
import { getSession } from 'next-auth/react'
import { getServerSession } from 'next-auth/next'

// NextAuth v5 (FlowFox uses)
import { auth } from '@/lib/auth'  // New unified API
const session = await auth()
```

**Resolution Options:**

**Option A: Upgrade StratOps to NextAuth v5** (RECOMMENDED but high effort)
```bash
npm install next-auth@beta
```
- ✅ Future-proof (v5 will be stable soon)
- ✅ Better TypeScript support
- ✅ Unified session API
- ❌ Requires refactoring ALL auth code in StratOps
- ❌ Migration guide needed: https://authjs.dev/getting-started/migrating-to-v5

**Option B: Downgrade FlowFox to NextAuth v4** (EASIER short-term)
```bash
# In FlowFox codebase
npm install next-auth@^4.24.7
```
- ✅ Immediate compatibility
- ✅ No changes to StratOps
- ❌ Will need upgrade later when v5 becomes stable
- ❌ Requires refactoring FlowFox auth code (8+ files affected)

**Option C: Run FlowFox as Isolated Module** (COMPLEX)
- Use iframe or micro-frontend architecture
- Separate auth contexts
- Not recommended due to UX complexity

---

### 3. **Supabase Client Version Gap** ⚠️ MEDIUM PRIORITY
| Package | StratOps | FlowFox | Issue |
|---------|----------|---------|-------|
| `@supabase/supabase-js` | **2.39.0** | **2.91.0** | 52 minor versions behind |
| `@supabase/ssr` | ❌ **MISSING** | **0.8.0** | Required for SSR |

**Impact:**
- Missing bug fixes and features in older version
- `@supabase/ssr` is REQUIRED for server-side rendering with Next.js 15+
- FlowFox server components won't work without `@supabase/ssr`

**Resolution:**
```bash
# Upgrade Supabase (safe - backwards compatible within v2)
npm install @supabase/supabase-js@^2.91.0 @supabase/ssr@^0.8.0
```

**Migration Notes:**
- Update Supabase client initialization in StratOps
- Replace direct client usage with SSR-aware clients
- See: https://supabase.com/docs/guides/auth/server-side/nextjs

---

### 4. **date-fns Version Mismatch** ⚠️ LOW PRIORITY
| Package | StratOps | FlowFox | Issue |
|---------|----------|---------|-------|
| `date-fns` | **3.6.0** | **4.1.0** | Major version difference |

**Impact:**
- date-fns v4 has breaking API changes
- Some functions renamed/removed
- Module import structure changed

**Resolution:**
```bash
# Option A: Upgrade StratOps to v4
npm install date-fns@^4.1.0
# May require code changes in StratOps if using affected functions

# Option B: Keep separate versions (use npm aliasing)
npm install date-fns-v4@npm:date-fns@^4.1.0
# FlowFox imports from 'date-fns-v4', StratOps uses 'date-fns'
```

---

## ✅ MISSING DEPENDENCIES (Required for FlowFox)

### 5. **Drag-and-Drop Libraries** - REQUIRED
FlowFox Kanban board requires these packages:

```bash
npm install @dnd-kit/core@^6.3.1 \
            @dnd-kit/sortable@^10.0.0 \
            @dnd-kit/utilities@^3.2.2
```

**Purpose:**
- Card dragging within columns
- Column reordering
- Multi-board drag operations

**Bundle Size Impact:** ~45KB (gzipped)

---

### 6. **Google Gemini AI Client** - OPTIONAL
```bash
npm install @google/generative-ai@^0.24.1
```

**Purpose:**
- AI-powered board generation
- Task suggestions
- Natural language processing

**Can be disabled** if not needed - FlowFox has feature flags.

---

### 7. **Motion Animation Library** - OPTIONAL
```bash
npm install motion@^12.27.5
```

**Purpose:**
- Smooth card animations
- Drag-and-drop visual feedback
- Transitions

**Can be replaced** with CSS animations if bundle size is a concern.

---

## ✅ COMPATIBLE DEPENDENCIES (No Changes Needed)

These packages are compatible between StratOps and FlowFox:

| Package | StratOps | FlowFox | Status |
|---------|----------|---------|--------|
| `react` | 19.2.3 | 19.2.3 | ✅ Identical |
| `react-dom` | 19.2.3 | 19.2.3 | ✅ Identical |
| `@tanstack/react-query` | 5.90.19 | 5.90.19 | ✅ Identical |
| `zustand` | 5.0.10 | 5.0.10 | ✅ Identical |
| `lucide-react` | 0.562.0 | 0.562.0 | ✅ Identical |
| `sonner` | 2.0.7 | 2.0.7 | ✅ Identical |
| `next-themes` | 0.4.6 | 0.4.6 | ✅ Identical |
| `cmdk` | 1.1.1 | 1.1.1 | ✅ Identical |
| `clsx` | 2.1.1 | 2.1.1 | ✅ Identical |
| `class-variance-authority` | 0.7.1 | 0.7.1 | ✅ Identical |
| `tailwindcss` | 4.1.18 | 4.x | ✅ Compatible |
| `@tailwindcss/postcss` | 4.1.18 | 4.x | ✅ Compatible |

**All Radix UI packages** are identical versions - no conflicts.

---

## 🔧 INTEGRATION STRATEGIES

### Strategy 1: Full Upgrade (RECOMMENDED for long-term)
Upgrade StratOps to match FlowFox dependencies:

```bash
# Critical upgrades
npm install next@16.1.4 \
            next-auth@beta \
            @supabase/supabase-js@^2.91.0 \
            @supabase/ssr@^0.8.0 \
            date-fns@^4.1.0

# FlowFox-specific additions
npm install @dnd-kit/core@^6.3.1 \
            @dnd-kit/sortable@^10.0.0 \
            @dnd-kit/utilities@^3.2.2 \
            @google/generative-ai@^0.24.1 \
            motion@^12.27.5
```

**Effort Level:** 2-3 days
**Benefits:**
- Clean integration
- Future-proof
- No version conflicts

**Required Code Changes:**
1. Migrate NextAuth v4 → v5 (affects all auth code)
2. Update Supabase client initialization
3. Test all existing auth flows
4. Update date-fns usage if using v3-specific APIs

---

### Strategy 2: Partial Integration (FASTER short-term)
Keep StratOps mostly unchanged, adapt FlowFox:

```bash
# Only add missing FlowFox dependencies
npm install @supabase/ssr@^0.8.0 \
            @dnd-kit/core@^6.3.1 \
            @dnd-kit/sortable@^10.0.0 \
            @dnd-kit/utilities@^3.2.2 \
            @google/generative-ai@^0.24.1 \
            motion@^12.27.5
```

**Then downgrade FlowFox to match StratOps:**
- Downgrade FlowFox to Next.js 15
- Refactor FlowFox to use NextAuth v4
- Use date-fns v3 in FlowFox

**Effort Level:** 1-2 days (FlowFox refactoring)
**Benefits:**
- No changes to existing StratOps code
- Faster integration

**Drawbacks:**
- Technical debt (FlowFox uses older APIs)
- Will need upgrade path later

---

### Strategy 3: Monorepo with Separate Builds (COMPLEX)
Keep FlowFox and StratOps as separate packages:

```
stratops-monorepo/
├── packages/
│   ├── stratops-core/      (Next.js 15, NextAuth v4)
│   ├── flowfox/            (Next.js 16, NextAuth v5)
│   └── shared-ui/          (Common components)
└── apps/
    └── web/                (Shell app that loads both)
```

**Tools:** Nx, Turborepo, or pnpm workspaces

**Effort Level:** 3-5 days
**Benefits:**
- Complete isolation
- Independent deployment
- Version independence

**Drawbacks:**
- Complex build setup
- Shared state is difficult
- Auth context must be bridged

---

## 📊 RECOMMENDED MIGRATION PATH

### Phase 1: Pre-Integration Prep (1 day)
1. ✅ Audit StratOps NextAuth usage (list all files using `next-auth`)
2. ✅ Backup StratOps codebase
3. ✅ Set up feature branch for integration
4. ✅ Run StratOps test suite baseline

### Phase 2: Core Dependency Updates (1 day)
1. Upgrade Supabase: `@supabase/supabase-js@^2.91.0` + `@supabase/ssr@^0.8.0`
2. Add FlowFox-specific deps: `@dnd-kit/*`, `@google/generative-ai`, `motion`
3. Test StratOps still works
4. Commit checkpoint

### Phase 3: Next.js Upgrade (Half day)
1. Upgrade to Next.js 16.1.4
2. Update `eslint-config-next` to 16.1.4
3. Test all routes and middleware
4. Fix any breaking changes

### Phase 4: NextAuth v5 Migration (1-2 days)
1. Follow official migration guide: https://authjs.dev/getting-started/migrating-to-v5
2. Update auth configuration
3. Refactor session access throughout StratOps
4. Update middleware
5. Test all auth flows (login, logout, protected routes)

### Phase 5: FlowFox Integration (1 day)
1. Copy FlowFox `/src/lib/`, `/src/components/board/`, `/src/hooks/` to StratOps
2. Run Supabase migrations
3. Configure environment variables
4. Mount FlowFox UI in StratOps routes
5. Test end-to-end

### Phase 6: Testing & Polish (1 day)
1. Run full test suite
2. Manual QA of both systems
3. Performance testing
4. Documentation

**Total Estimated Time:** 5-7 days for complete integration

---

## 🎯 QUICK COMPATIBILITY CHECKLIST

Before integrating, verify these StratOps configurations:

- [ ] **Database**: Using Supabase PostgreSQL (not MySQL, MongoDB, etc.)
- [ ] **Auth Provider**: Google OAuth configured (matches FlowFox)
- [ ] **Node Version**: >= 18.0.0 (both require this)
- [ ] **Package Manager**: npm >= 9.0.0 or pnpm/yarn equivalent
- [ ] **TypeScript**: v5.x (both use this)
- [ ] **Tailwind v4**: Already using (compatible)

---

## 🚀 IMMEDIATE ACTION ITEMS

To integrate FlowFox into StratOps, prioritize these tasks:

### Critical (Blocks Integration)
1. **Decide on NextAuth strategy** (v4 vs v5)
2. **Upgrade Supabase client** + add `@supabase/ssr`
3. **Upgrade Next.js to 16.x** (or downgrade FlowFox to 15.x)

### High Priority
4. **Install drag-and-drop libraries** (`@dnd-kit/*`)
5. **Run FlowFox database migrations** in StratOps Supabase
6. **Update date-fns** to v4 (or use aliasing)

### Medium Priority
7. **Add Gemini AI client** (if using AI features)
8. **Configure Google Tasks API** scope in OAuth
9. **Test Supabase RLS policies** with StratOps users

### Low Priority
10. **Install motion library** (or use CSS fallbacks)
11. **Merge Tailwind configs** (theme tokens)
12. **Update tsconfig paths** for FlowFox imports

---

## 💡 QUESTIONS TO ANSWER

Before proceeding, clarify these architectural decisions:

1. **NextAuth Version**: Upgrade StratOps to v5, or downgrade FlowFox to v4?
2. **Deployment**: Monolith or separate services?
3. **Database**: Shared Supabase instance or separate?
4. **Auth**: Single SSO or separate auth contexts?
5. **Branding**: Keep FlowFox UI or rebrand to StratOps theme?
6. **Features**: Need all FlowFox features (Google Tasks, Gemini AI) or subset?

---

## 📚 RESOURCES

- **NextAuth v5 Migration Guide**: https://authjs.dev/getting-started/migrating-to-v5
- **Next.js 16 Upgrade Guide**: https://nextjs.org/docs/upgrading
- **Supabase SSR Setup**: https://supabase.com/docs/guides/auth/server-side/nextjs
- **date-fns v4 Changelog**: https://github.com/date-fns/date-fns/releases/tag/v4.0.0

---

## 🔒 RISK ASSESSMENT

| Risk | Severity | Mitigation |
|------|----------|------------|
| NextAuth v5 breaking changes | HIGH | Comprehensive testing, staged rollout |
| Next.js 16 middleware changes | MEDIUM | Review middleware docs, test all routes |
| Supabase version gap issues | LOW | Upgrade is backwards compatible |
| Bundle size increase | LOW | Code splitting, lazy loading |
| Performance regression | MEDIUM | Lighthouse CI, performance monitoring |
| Auth session conflicts | HIGH | Single auth provider, clear session management |

---

**Last Updated**: 2026-01-22
**Analyzed By**: Claude Code
**FlowFox Version**: 0.1.0
**StratOps Version**: 2.0.0
