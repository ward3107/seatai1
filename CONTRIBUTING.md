# Contributing to SeatAI

Thank you for your interest in contributing to SeatAI! This document provides guidelines for contributing to the project.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

---

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

---

## Getting Started

### Prerequisites

1. **Rust** (1.70+) - Install from [rustup.rs](https://rustup.rs)
2. **wasm-pack** - Run: `cargo install wasm-pack`
3. **Node.js 18+** - Install from [nodejs.org](https://nodejs.org)
4. **Git** - Install from [git-scm.com](https://git-scm.com)

### Initial Setup

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/YOUR_USERNAME/seatai.git
cd seatai

# Install dependencies
cd web && npm install && cd ..

# Build WASM core
cd core && wasm-pack build --target web --out-dir ../web/src/wasm && cd ..
```

### Development Server

```bash
# Terminal 1: Build WASM in watch mode
cd core && wasm-pack build --target web --out-dir ../web/src/wasm --dev

# Terminal 2: Start dev server
cd web && npm run dev
```

Open http://localhost:5173

---

## Development Workflow

### 1. Create a Branch

```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

**Branch naming:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Adding/updating tests
- `chore/` - Maintenance tasks

### 2. Make Changes

- Write clean, readable code
- Follow coding standards (see below)
- Add/update tests as needed
- Update documentation

### 3. Test Your Changes

```bash
# Run web tests
cd web && npm test

# Run Rust tests
cd core && cargo test

# Run linters
cd web && npm run lint
cd core && cargo clippy
```

### 4. Commit Changes

```bash
git add .
git commit -m "feat: add student CSV import feature"
```

**Commit message format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting, missing semicolons
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance

**Example:**
```
feat(students): add CSV import functionality

- Add CsvImport component
- Parse CSV with validation
- Handle encoding issues

Closes #123
```

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

---

## Coding Standards

### TypeScript/JavaScript

- **Use TypeScript** for all new files
- **Prefer `const` over `let`**
- **Use template literals** over string concatenation
- **Use arrow functions** for callbacks
- **Avoid `any`** - use proper types or `unknown`

```typescript
// ✅ Good
const students: Student[] = await getStudents();

// ❌ Bad
const students = await getStudents();
const students: any[] = await getStudents();
```

### React

- **Use functional components** with hooks
- **Prefer `useMemo`/`useCallback`** for expensive operations
- **Keep components small** - single responsibility
- **Use TypeScript** for props

```typescript
// ✅ Good
interface StudentCardProps {
  student: Student;
  onEdit: (id: string) => void;
}

export function StudentCard({ student, onEdit }: StudentCardProps) {
  return <div onClick={() => onEdit(student.id)}>{student.name}</div>;
}
```

### File Organization

- **Feature-based structure** in `web/src/features/`
- **Co-locate** related components, hooks, types
- **Index exports** for clean imports

```
web/src/features/my-feature/
├── MyFeature.tsx
├── MyFeature.test.tsx
├── hooks.ts
├── types.ts
└── index.ts
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `StudentCard.tsx` |
| Hooks | camelCase with `use` | `useStudents.ts` |
| Functions | camelCase | `formatName()` |
| Constants | UPPER_SNAKE_CASE | `MAX_STUDENTS` |
| Types/Interfaces | PascalCase | `StudentConfig` |

### Import Order

```typescript
// 1. React & libraries
import { useState } from 'react';
import { motion } from 'framer-motion';

// 2. Internal components
import { SeatCard } from './SeatCard';

// 3. Hooks
import { useOptimizer } from '@/hooks/useOptimizer';

// 4. Stores
import { useClassroomStore } from '@/core/store';

// 5. Types
import type { Student } from '@/types';

// 6. Utils
import { formatName } from '@/utils/sampleData';
```

### Rust

- **Use `cargo fmt`** for formatting
- **Use `cargo clippy`** for linting
- **Prefer `&str` over `String`** for function parameters
- **Use `Option`/`Result`** for error handling

```rust
// ✅ Good
pub fn optimize_student(&self, student: &Student) -> Result<Arrangement, Error> {
    // ...
}

// ❌ Bad
pub fn optimize_student(&self, student: Student) -> Arrangement {
    // ...
}
```

---

## Testing Guidelines

### Unit Tests

- **Test utilities** in `web/src/utils/`
- **Test stores** in `web/src/core/store/`
- **Test hooks** with `@testing-library/react-hooks`

```typescript
describe('formatStudentName', () => {
  it('should format full name correctly', () => {
    expect(formatName({ first: 'John', last: 'Doe' })).toBe('John Doe');
  });

  it('should handle missing last name', () => {
    expect(formatName({ first: 'John' })).toBe('John');
  });
});
```

### Component Tests

- **Test user behavior**, not implementation
- **Use `@testing-library/react`**
- **Test accessibility** with `jest-axe` (future)

```typescript
describe('StudentCard', () => {
  it('should render student name', () => {
    render(<StudentCard student={mockStudent} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should call onEdit when clicked', () => {
    const onEdit = vi.fn();
    render(<StudentCard student={mockStudent} onEdit={onEdit} />);
    fireEvent.click(screen.getByText('John Doe'));
    expect(onEdit).toHaveBeenCalledWith('123');
  });
});
```

### Rust Tests

- **Unit tests** next to code in `core/src/`
- **Integration tests** in `core/tests/`

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_academic_fitness() {
        let students = create_test_students();
        let fitness = calculate_academic_fitness(&students);
        assert!(fitness >= 0.0 && fitness <= 1.0);
    }
}
```

### Test Coverage

- **Aim for 80%+ coverage** on new code
- **Test critical paths** thoroughly
- **Use `npm test -- --coverage`** to check

---

## Pull Request Process

### Before Submitting

1. **Update documentation** if needed
2. **Add/update tests**
3. **Run all tests** - ensure they pass
4. **Run linters** - fix any warnings
5. **Update CHANGELOG.md** (if user-facing)

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests pass locally
```

### Review Process

1. **Automated checks** must pass
2. **One reviewer** approval required
3. **Address feedback** promptly
4. **Squash commits** if requested
5. **Delete branch** after merge

---

## Reporting Issues

### Bug Reports

Include:
- **Description** - Clear description of the bug
- **Steps to reproduce** - Minimal reproduction
- **Expected behavior** - What should happen
- **Actual behavior** - What actually happens
- **Environment** - OS, browser, versions
- **Screenshots** - If applicable

### Feature Requests

Include:
- **Problem statement** - What problem does this solve?
- **Proposed solution** - How should it work?
- **Alternatives** - Other approaches considered
- **Additional context** - Related issues, examples

---

## Questions?

- Open an issue for bugs or feature requests
- Check [docs/FUTURE_PLANS.md](docs/FUTURE_PLANS.md) for roadmap
- See [CLAUDE.md](CLAUDE.md) for development context

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

*Thank you for contributing to SeatAI! 🎉*
