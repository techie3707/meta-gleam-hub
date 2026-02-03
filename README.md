# Meta Gleam Hub - DSpace React UI

## Project Overview

A modern React-based frontend for DSpace 7 digital repository system, providing an intuitive UI for managing collections, items, bitstreams, users, and workflows.

### Key Features
- 🔐 Authentication & Authorization with JWT tokens
- 📚 Hierarchical collection management
- 🔍 Advanced search with facets and filters
- 📄 PDF/Image viewing with secure downloads
- 👥 User and group management
- 📊 Workflow management
- 📦 Batch import functionality
- 🔒 Access control and permissions

---

## 📋 DSpace Integration Status

**Current Status:** 75% Complete

- ✅ **API Layer:** 100% - All 80+ endpoints implemented
- ✅ **Authentication:** 100% - Full JWT + CSRF flow
- ✅ **Configuration:** 100% - Complete site config
- 🟡 **Pages:** 60% - Core pages ready, admin pages pending
- 🔴 **Testing:** 0% - Not started

### Quick Links
- 📊 [Integration Status Report](DSPACE_INTEGRATION_STATUS.md)
- 📖 [Implementation Guide](IMPLEMENTATION_GUIDE.md)
- 📝 [Integration Summary](README_INTEGRATION.md)
- ✅ [Implementation Checklist](CHECKLIST.md)

---

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- DSpace 7.x backend running with REST API enabled
- Backend CORS configured for frontend URL

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd meta-gleam-hub

# Install dependencies
npm install

# Install DSpace-specific dependencies
npm install pdfjs-dist@3.11.174 react-dropzone@14.2.3

# Start development server
npm run dev
```

### Configuration

1. **Update API Endpoint**
   
   Edit `src/config/siteConfig.ts`:
   ```typescript
   apiEndpoint: "http://your-dspace-server:8080/server"
   ```

2. **Configure DSpace Backend CORS**
   
   Add to `[dspace]/config/local.cfg`:
   ```properties
   rest.cors.allowed-origins = http://localhost:5173
   rest.cors.allowed-methods = GET, POST, PUT, PATCH, DELETE, OPTIONS
   rest.cors.allowed-headers = *
   rest.cors.exposed-headers = Authorization, DSPACE-XSRF-TOKEN
   rest.cors.allow-credentials = true
   ```

3. **Test the Integration**
   - Navigate to http://localhost:5173/login
   - Login with DSpace credentials
   - Verify dashboard loads

---

## 📚 Documentation

### Essential Reading
1. **[IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)** - Step-by-step implementation instructions
2. **[DSPACE_INTEGRATION_STATUS.md](DSPACE_INTEGRATION_STATUS.md)** - Complete status report
3. **[CHECKLIST.md](CHECKLIST.md)** - Task checklist for completion

### DSpace Resources
- [DSpace 7 REST API Documentation](https://wiki.lyrasis.org/display/DSDOC7x/REST+API)
- [DSpace 7 Documentation](https://wiki.lyrasis.org/display/DSDOC7x)

---

## 🏗️ Project Structure

```
src/
├── api/                    # API service layer (100% complete)
│   ├── authApi.ts         # Authentication
│   ├── userApi.ts         # User management
│   ├── groupApi.ts        # Group management
│   ├── collectionApi.ts   # Collections
│   ├── itemApi.ts         # Items
│   ├── bitstreamApi.ts    # File operations ✨ NEW
│   ├── processApi.ts      # Batch import & processes ✨ NEW
│   ├── metadataApi.ts     # Metadata management ✨ NEW
│   └── ...
├── components/            # Reusable UI components
│   ├── auth/             # Authentication components
│   ├── layout/           # Layout components
│   ├── ui/               # shadcn/ui components (40+)
│   └── ...
├── contexts/             # React Context providers
│   └── AuthContext.tsx   # Authentication state
├── pages/                # Page components
│   ├── Login.tsx
│   ├── Index.tsx         # Dashboard
│   ├── Search.tsx
│   ├── UserManagement.tsx ✨ NEW
│   └── ...
├── config/               # Configuration
│   └── siteConfig.ts     # Centralized config
└── lib/                  # Utilities
```

---

## 🔧 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** - Build tool
- **React Router v6** - Routing
- **TanStack Query** - Data fetching & caching
- **Axios** - HTTP client
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components (Radix UI)
- **Lucide React** - Icons

### Backend Integration
- **DSpace 7.x** - Digital repository
- **REST API** - Backend communication
- **JWT** - Authentication
- **CSRF Protection** - Security

---

## 📦 Available Scripts

```bash
# Development
npm run dev              # Start dev server

# Build
npm run build           # Production build
npm run build:dev       # Development build

# Preview
npm run preview         # Preview production build

# Linting
npm run lint            # Run ESLint
```

---

## 🎯 Current Implementation Status

### ✅ Completed (100%)
- API integration layer (80+ endpoints)
- Authentication system with JWT
- CSRF token management
- Axios configuration with interceptors
- User management page
- Core routing structure
- Comprehensive documentation

### 🟡 In Progress (60%)
- Core pages (Index, Search, Documents)
- Collection management
- Document viewing

### 🔴 To Do (0%)
- Group management page
- Workflow management page
- Item create/edit pages
- Process monitoring
- Specialized components (SecureImage, PDFRenderer)
- Comprehensive testing
- Production deployment

---

## 📝 Next Steps

Follow the [Implementation Guide](IMPLEMENTATION_GUIDE.md) to:

1. Update existing pages with DSpace data
2. Create missing admin pages
3. Build specialized components
4. Add comprehensive testing
5. Deploy to production

**Estimated Time to Complete:** 2-3 weeks

---

## 🤝 Development Workflow

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
