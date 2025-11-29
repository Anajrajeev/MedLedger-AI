# Cardano Health Agents - MedLedger AI

A privacy-preserving medical data platform where patients control their encrypted medical records and grant doctors/insurers access through on-chain consent using Cardano blockchain and Lit Protocol.

## 🏥 Features

- **Blockchain-based Consent Management**: On-chain access control using Cardano smart contracts
- **End-to-End Encryption**: Medical records encrypted and stored on IPFS/Filecoin
- **Decentralized Key Management**: Lit Protocol for secure key management
- **AI-Powered Analysis**: Masumi agents for medical data analysis and insights
- **Modern UI**: Liquid-glass aesthetic with responsive design
- **Wallet Integration**: Eternl wallet support for Cardano transactions

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Animations**: Framer Motion
- **Blockchain**: Cardano (Eternl wallet)
- **Encryption**: Lit Protocol
- **Storage**: IPFS/Filecoin
- **AI**: Masumi agents

## 📦 Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📁 Project Structure

```
cardano-health-agents/
├── app/
│   ├── layout.tsx          # Root layout with metadata
│   ├── page.tsx            # Main access request page
│   └── globals.css         # Global styles with glassmorphism utilities
├── components/
│   ├── ui/                 # shadcn/ui components
│   │   ├── avatar.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   └── card.tsx
│   ├── navbar.tsx          # Navigation bar with glassmorphism
│   ├── doctor-card.tsx     # Doctor profile component
│   ├── access-request-list.tsx  # Record type list
│   ├── on-chain-notice.tsx      # Blockchain notice
│   └── action-buttons.tsx       # Approve/Deny buttons
├── lib/
│   └── utils.ts            # Utility functions (cn helper)
└── public/
    └── (assets)            # Images and static files
```

## 🎨 Design System

### Color Palette
- **Medical Blue**: `#2D8DFE` - Primary actions, highlights
- **Teal Green**: `#00B8A9` - Secondary accents
- **White**: `#FFFFFF` - Base background
- **Soft Grays**: Neutral tones for text and borders

### UI Patterns
- **Glassmorphism**: Frosted glass effect with backdrop blur
- **Soft Shadows**: Subtle depth without harsh contrasts
- **Rounded Corners**: 12-16px border radius for modern feel
- **Smooth Animations**: Framer Motion for transitions

## 🔐 Security Features

- **On-chain Consent**: All access approvals recorded on Cardano blockchain
- **Read-only Access**: Temporary permissions with expiration
- **Transparent Logging**: Immutable audit trail
- **Encrypted Storage**: Medical records never stored in plaintext

## 🚀 Future Pages

Based on the navigation structure, you can create:

1. **Dashboard** (`/dashboard`)
   - Overview of recent activity
   - Quick stats and insights
   - Pending requests

2. **My Records** (`/records`)
   - Browse medical records
   - Upload new documents
   - Manage encryption keys

3. **Record Logs** (`/logs`)
   - View access history
   - Blockchain transaction details
   - Audit trail

4. **AI Assistant** (`/ai`)
   - Medical data analysis
   - Predictive insights
   - Insurance automation

## 📝 Accessibility

- Semantic HTML elements
- ARIA labels for screen readers
- Keyboard navigation support
- Focus visible states
- Responsive design (mobile to 4K)

## 🔧 Configuration

Key files:
- `tailwind.config.ts` - Tailwind theme and extensions
- `tsconfig.json` - TypeScript configuration
- `next.config.mjs` - Next.js settings

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please read CONTRIBUTING.md for guidelines.

