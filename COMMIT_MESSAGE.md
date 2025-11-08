refactor: migrate to feature-first architecture with path aliases

## 🎯 Major Changes

### Architecture Refactoring
- Migrate from page-based to feature-first architecture
- Rename `pages/DataSource` → `features/vocabulary` for better semantics
- Rename `ManagerFile.tsx` → `VocabularyPage.tsx` for clarity
- Organize codebase into feature modules with clear boundaries

### Path Aliases Setup
- Configure CRACO for Create React App customization
- Add `tsconfig-paths-webpack-plugin` for path alias resolution
- Setup comprehensive path aliases in `tsconfig.json`:
  - `@/*` - Root src directory
  - `@components/*` - Shared components
  - `@features/*` - Feature modules
  - `@layouts/*`, `@hooks/*`, `@utils/*`, `@types`, `@services/*`, etc.
- Update all imports to use clean path aliases

### Feature Module: Vocabulary
```
features/vocabulary/
├── components/
│   ├── dialogs/        # 5 reusable dialog components
│   └── FolderTree/     # Recursive tree component
├── constants/          # Word types & seed data
├── hooks/              # Feature-specific hooks (ready for use)
├── pages/              # VocabularyPage
├── types/              # Type definitions
├── utils/              # Tree, storage, speech utilities
└── index.ts            # Barrel exports
```

### Global Infrastructure
- **types/**: Common types (ApiResponse, User, AuthTokens, etc.)
- **utils/**: 
  - `date.ts` - Date formatting & relative time
  - `string.ts` - String manipulation utilities
  - `validation.ts` - Form validation helpers
  - `storage.ts` - LocalStorage wrapper
  - `format.ts` - Number, currency, file size formatting
- **services/**:
  - `api.ts` - Axios instance with interceptors
  - `authService.ts` - Authentication API
  - `vocabService.ts` - Vocabulary API

### Route Updates
- Update route path: `/source-data` → `/vocabulary`
- Update imports in `routes.tsx` to use path aliases
- Update navigation links in `Navbar.tsx`

### Build Configuration
- Add CRACO config (`craco.config.js`) for webpack customization
- Update npm scripts to use CRACO instead of react-scripts:
  - `start: craco start`
  - `build: craco build`
  - `test: craco test`

### Documentation
- Update README.md with new architecture documentation
- Add project structure overview
- Document path aliases usage
- Add development setup instructions

### Cleanup
- Remove old `pages/DataSource/` directory
- Remove backup files
- Remove empty directories (`pages/Home`, `pages/Login`)
- Fix TypeScript export syntax in vocabulary index
- Fix ESLint warnings (unused imports, escape characters)

## 📦 Dependencies
- `@craco/craco@^7.1.0` - CRA configuration override
- `tsconfig-paths-webpack-plugin@^4.2.0` - Path alias resolution

## 🎨 Code Quality
- ✅ Zero linter errors
- ✅ TypeScript strict mode compliant
- ✅ Consistent import patterns
- ✅ Proper barrel exports
- ✅ Clean architecture separation

## 🚀 Benefits
1. **Better Scalability**: Feature-based structure scales better than page-based
2. **Improved Maintainability**: Clear feature boundaries and responsibilities
3. **Cleaner Imports**: Path aliases eliminate relative path hell
4. **Enhanced DX**: Better developer experience with organized codebase
5. **Future-Ready**: Infrastructure ready for additional features

## ⚠️ Breaking Changes
- Route changed: `/source-data` → `/vocabulary`
- Import paths changed from relative to absolute (internal only)
- Build system now uses CRACO (transparent to users)

## 📝 Migration Guide
Developers should:
1. Use path aliases for imports: `import { X } from '@/features/vocabulary'`
2. Follow feature-first structure for new features
3. Place shared code in appropriate global directories
4. Run `npm install` to get new dependencies

---

**Tested**: ✅ App compiles and runs successfully  
**Linter**: ✅ No errors  
**TypeScript**: ✅ All types valid  
**Features**: ✅ All vocabulary features working

