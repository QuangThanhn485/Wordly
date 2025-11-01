# Wordly - English Vocabulary Learning App

A modern web application built with React and TypeScript to help users learn and practice English vocabulary effectively.

## 🚀 Features

- **Vocabulary Management**: Organize vocabulary in folders and files
- **CRUD Operations**: Add, edit, delete vocabulary items with ease
- **Import/Export**: Import vocabulary from files and export to share
- **Practice Modes**: Multiple training modes to reinforce learning
- **LocalStorage**: All data persists locally in your browser
- **Dark Mode**: Eye-friendly dark theme support
- **Responsive Design**: Works seamlessly on desktop and mobile

## 📁 Project Structure

```
wordly/
├── src/
│   ├── features/              # Feature-based modules
│   │   ├── auth/              # Authentication feature
│   │   ├── vocabulary/        # Vocabulary management
│   │   └── training/          # Training modes
│   │
│   ├── components/            # Shared UI components
│   │   ├── ui/                # Basic UI components
│   │   ├── forms/             # Form components
│   │   └── layout/            # Layout components
│   │
│   ├── layouts/               # App layouts
│   ├── hooks/                 # Custom React hooks
│   ├── utils/                 # Utility functions
│   ├── types/                 # TypeScript type definitions
│   ├── services/              # API services
│   ├── constants/             # Constants and configs
│   ├── contexts/              # React contexts
│   └── assets/                # Static assets
│
├── public/                    # Public assets
└── build/                     # Production build

```

## 🛠️ Tech Stack

- **Frontend Framework**: React 19.1.0
- **Language**: TypeScript 4.9.5
- **UI Library**: Material-UI 7.1.0
- **State Management**: Redux Toolkit 2.8.2
- **Routing**: React Router 6.30.0
- **Styling**: Emotion (CSS-in-JS)
- **Build Tool**: React Scripts 5.0.1

## 📦 Installation

```bash
# Clone the repository
git clone <repository-url>
cd wordly

# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
REACT_APP_API_BASE_URL=http://localhost:3000/api
REACT_APP_NAME=Wordly
REACT_APP_VERSION=1.0.0
```

### Path Aliases

The project uses path aliases for cleaner imports:

```typescript
import { VocabularyPage } from '@/features/vocabulary';
import { Button } from '@/components/ui';
import { formatDate } from '@/utils';
import type { User } from '@/types';
```

## 📚 Key Features Documentation

### Vocabulary Management

Located in `src/features/vocabulary/`:

- **Components**: Reusable UI components (FolderTree, Dialogs)
- **Pages**: Main vocabulary page
- **Types**: TypeScript definitions for vocabulary data
- **Utils**: Helper functions for tree manipulation, storage, speech
- **Constants**: Word types, seed data

### LocalStorage Structure

```typescript
// Vocabulary data
wordly_vocab_map: Record<string, VocabItem[]>

// Folder structure
wordly_folder_tree: FolderNode
```

## 🎨 UI Components

All shared components are organized in `src/components/`:

- **ui/**: Basic UI elements (Button, Alert, Modal)
- **forms/**: Form inputs and controls
- **layout/**: Layout components (Header, Sidebar)

## 🔌 API Services

API client setup with axios, located in `src/services/`:

- Auto token refresh
- Request/response interceptors
- Type-safe API calls

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm test -- --coverage
```

## 📝 Code Style

- **ESLint**: Enforces code quality
- **TypeScript**: Strict mode enabled
- **Prettier**: Code formatting (if configured)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

## 👥 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- Material-UI for the excellent component library
- React community for the amazing ecosystem
- All contributors who help improve this project

## 📞 Support

For support, email your-email@example.com or open an issue in the repository.

---

Made with ❤️ by [Your Name]
