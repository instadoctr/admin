# InstaDoctr Admin Portal

Web-based admin portal for managing InstaDoctr operations.

## Features

- **Provider Verification**: Review and approve/reject healthcare provider applications
- **Lab Test Coordination**: Manage lab test bookings and status updates
- **Appointment Management**: Handle provider appointments and quick book requests
- **Cancellation Approvals**: Approve or reject cancellation requests
- **Dashboard & Analytics**: View key metrics and recent activity

## Tech Stack

- React Native + Expo (web-only)
- TypeScript
- Expo Router (file-based routing)
- AWS Cognito (admin authentication)
- AWS API Gateway + Lambda (backend)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Update .env with your AWS configuration
```

### Development

```bash
# Start development server (web only)
npm start

# Or directly
npm run web
```

### Build

```bash
# Build for production
npm run build:web
```

## Project Structure

```
instadoctr-admin/
├── app/                    # Screens (Expo Router)
│   ├── index.tsx          # Landing page
│   ├── login.tsx          # Admin login
│   ├── (admin-tabs)/      # Main admin interface
│   │   ├── dashboard.tsx
│   │   ├── providers.tsx
│   │   ├── lab-tests.tsx
│   │   ├── appointments.tsx
│   │   └── cancellations.tsx
├── components/             # Reusable UI components
├── contexts/               # React Context providers
├── services/               # API client & services
├── types/                  # TypeScript type definitions
└── constants/              # Configuration & constants
```

## Deployment

### AWS Amplify

1. Create new Amplify app in AWS Console
2. Connect to GitHub repository
3. Configure build settings (see below)
4. Set environment variables
5. Deploy!

**Build Settings (amplify.yml)**:
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm install
    build:
      commands:
        - npx expo export:web
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
```

## Environment Variables

Set these in AWS Amplify or your hosting provider:

- `EXPO_PUBLIC_API_URL` - API Gateway URL
- `EXPO_PUBLIC_COGNITO_USER_POOL_ID` - Admin Cognito user pool ID
- `EXPO_PUBLIC_COGNITO_CLIENT_ID` - Admin Cognito client ID
- `EXPO_PUBLIC_COGNITO_REGION` - AWS region (ap-south-1)

## License

Proprietary - InstaDoctr
