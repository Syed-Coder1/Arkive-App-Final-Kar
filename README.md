# Arkive - Tax Office Management System

A comprehensive, modern tax office management system built with React, TypeScript, and Vite. This application provides complete client management, receipt tracking, expense monitoring, advanced analytics, and data export capabilities with both web and desktop deployment options.

## 🚀 Features

### Core Functionality
- 🔐 **Secure Authentication** - Two admin accounts maximum with Firebase sync
- 📊 **Interactive Dashboard** - Real-time charts and comprehensive statistics with smooth animations
- 🧾 **Receipt Management** - CNIC-linked receipts with payment tracking and CRUD operations
- 👥 **Client Management** - Complete client profiles with payment history and editing capabilities
- 💰 **Expense Tracking** - Categorized expense management with full CRUD operations
- 📈 **Advanced Analytics** - Monthly trends, client performance, growth metrics, and revenue forecasting
- 📱 **Responsive Design** - Optimized for desktop, tablet, and mobile devices
- 🌙 **Dark Mode** - Full dark mode support with smooth transition animations

### Advanced Features
- 📋 **Excel Export** - Professional Excel exports for receipts, clients, and payment histories
- 🔄 **Firebase Sync** - Real-time synchronization across all devices and accounts
- 📝 **Activity Logging** - Comprehensive audit trail of all user actions
- 🔔 **Smart Notifications** - Real-time alerts with dashboard integration
- 🎯 **Quick Actions** - Direct form access from dashboard for streamlined workflows
- 🖥️ **Desktop Application** - Electron-based desktop app for offline use
- ⚡ **Performance Optimized** - Efficient data handling with smooth animations and transitions
- 🎨 **Enhanced UX** - Smooth page transitions, hover effects, and micro-interactions
- 🔒 **Secure Vault** - Encrypted document storage with access logging
- 👨‍💼 **Employee Management** - Complete HR system with attendance tracking
- 🧮 **Tax Calculator** - FBR-compliant tax calculations for 2025-26

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Type-safe development with full IntelliSense support
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework with custom animations

### UI Components & Icons
- **Lucide React** - Beautiful, customizable SVG icons
- **Recharts** - Responsive chart library for data visualization
- **clsx** - Utility for constructing className strings conditionally

### Data Management
- **IndexedDB** - Browser-based NoSQL database for offline storage
- **Firebase Realtime Database** - Cloud synchronization and real-time updates
- **Custom Database Service** - Abstracted database operations with TypeScript interfaces
- **React Context** - State management for authentication and global data

### Utilities & Services
- **date-fns** - Modern JavaScript date utility library
- **xlsx** - Excel file generation and manipulation
- **Custom Export Service** - Specialized Excel export functionality

### Desktop Application
- **Electron** - Cross-platform desktop application framework
- **Electron Builder** - Application packaging and distribution

## 🔥 Firebase Integration

### Database Structure

The Firebase Realtime Database is organized as follows:

```
arkive-database/
├── users/
│   └── {userId}/
│       ├── id: string
│       ├── username: string
│       ├── password: string (hashed)
│       ├── role: "admin" | "employee"
│       ├── createdAt: ISO string
│       ├── lastLogin: ISO string
│       ├── lastModified: ISO string
│       └── syncedBy: deviceId
├── clients/
│   └── {clientId}/
│       ├── id: string
│       ├── name: string
│       ├── cnic: string (13 digits)
│       ├── password: string
│       ├── type: "IRIS" | "SECP" | "PRA" | "Other"
│       ├── phone: string
│       ├── email: string
│       ├── notes: string
│       ├── createdAt: ISO string
│       ├── updatedAt: ISO string
│       ├── lastModified: ISO string
│       └── syncedBy: deviceId
├── receipts/
│   └── {receiptId}/
│       ├── id: string
│       ├── clientName: string
│       ├── clientCnic: string
│       ├── amount: number
│       ├── natureOfWork: string
│       ├── paymentMethod: "cash" | "bank_transfer" | "cheque" | "card" | "online"
│       ├── date: ISO string
│       ├── createdAt: ISO string
│       ├── createdBy: userId
│       ├── lastModified: ISO string
│       └── syncedBy: deviceId
├── expenses/
│   └── {expenseId}/
│       ├── id: string
│       ├── description: string
│       ├── amount: number
│       ├── category: "office" | "utilities" | "supplies" | "maintenance" | "food" | "rent" | "salary" | "other"
│       ├── date: ISO string
│       ├── createdAt: ISO string
│       ├── createdBy: userId
│       ├── lastModified: ISO string
│       └── syncedBy: deviceId
├── documents/
│   └── {documentId}/
│       ├── id: string
│       ├── clientCnic: string
│       ├── fileName: string
│       ├── fileType: "cnic" | "tax_file" | "contract" | "invoice" | "other"
│       ├── fileSize: number
│       ├── mimeType: string
│       ├── encryptedData: string (base64)
│       ├── tags: string[]
│       ├── uploadedBy: userId
│       ├── uploadedAt: ISO string
│       ├── lastAccessed: ISO string
│       ├── accessLog: AccessLogEntry[]
│       ├── lastModified: ISO string
│       └── syncedBy: deviceId
├── employees/
│   └── {employeeId}/
│       ├── id: string
│       ├── employeeId: string
│       ├── name: string
│       ├── email: string
│       ├── phone: string
│       ├── position: string
│       ├── department: string
│       ├── salary: number
│       ├── joinDate: ISO string
│       ├── status: "active" | "inactive" | "terminated"
│       ├── username: string
│       ├── password: string
│       ├── role: "employee" | "manager"
│       ├── createdAt: ISO string
│       ├── updatedAt: ISO string
│       ├── lastModified: ISO string
│       └── syncedBy: deviceId
├── attendance/
│   └── {attendanceId}/
│       ├── id: string
│       ├── employeeId: string
│       ├── date: ISO string
│       ├── checkIn: ISO string
│       ├── checkOut: ISO string
│       ├── status: "present" | "absent" | "late" | "half-day" | "leave"
│       ├── notes: string
│       ├── workingHours: number
│       ├── createdAt: ISO string
│       ├── lastModified: ISO string
│       └── syncedBy: deviceId
├── notifications/
│   └── {notificationId}/
│       ├── id: string
│       ├── message: string
│       ├── type: "info" | "warning" | "error" | "success"
│       ├── read: boolean
│       ├── createdAt: ISO string
│       ├── lastModified: ISO string
│       └── syncedBy: deviceId
└── sync_metadata/
    └── {deviceId}/
        └── lastSync: ISO string
```

### Firebase Configuration

The Firebase configuration is located in `src/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "AIzaSyDIo7q8OuI1P63q9t9E1s-ENQjBdCd37nI",
  authDomain: "arkive-da661.firebaseapp.com",
  databaseURL: "https://arkive-da661-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "arkive-da661",
  storageBucket: "arkive-da661.appspot.com",
  messagingSenderId: "416097604327",
  appId: "1:416097604327:web:198600d582bd82aeee8842"
};
```

### Sync Mechanism

1. **Real-time Listeners**: Each data store has a real-time listener that updates the local state when Firebase data changes
2. **Sync Queue**: All local changes are queued for Firebase sync, with retry logic for failed operations
3. **Conflict Resolution**: Firebase data takes precedence over local data to ensure consistency
4. **Device Tracking**: Each sync operation includes a `deviceId` to prevent infinite sync loops
5. **Offline Support**: Local IndexedDB continues to work offline, with automatic sync when connection is restored

### Authentication Limits

- **Maximum 2 Admin Accounts**: The system enforces a strict limit of 2 admin accounts
- **No Employee Accounts**: Only admin accounts can be created through the UI
- **Session Management**: 30-minute session timeout with automatic logout
- **Activity Logging**: All authentication events are logged for audit purposes

## 📁 Project Structure

```
arkive/
├── src/
│   ├── components/           # React components
│   │   ├── Dashboard.tsx     # Main dashboard with charts, statistics, and quick actions
│   │   ├── Receipts.tsx      # Receipt management with CRUD operations and Firebase sync
│   │   ├── Clients.tsx       # Client management with full profiles and Firebase sync
│   │   ├── Login.tsx         # Authentication interface with error handling
│   │   ├── Layout.tsx        # Main layout with collapsible sidebar
│   │   ├── Settings.tsx      # Application settings with Firebase sync controls
│   │   ├── Vault.tsx         # Secure document storage with encryption
│   │   ├── EmployeeManagement.tsx # HR system with attendance tracking
│   │   ├── TaxCalculator.tsx # FBR-compliant tax calculations
│   │   ├── SimplePages.tsx   # Expenses, Activity Log, Backup
│   │   └── AdvancedFeatures.tsx # Analytics, Smart Notifications
│   ├── contexts/             # React contexts
│   │   └── AuthContext.tsx   # Authentication state management
│   ├── services/             # Business logic and external services
│   │   ├── database.ts       # IndexedDB operations and Firebase sync
│   │   ├── firebaseSync.ts   # Firebase synchronization service
│   │   ├── auth.ts           # Authentication service with Firebase integration
│   │   ├── export.ts         # Excel export functionality
│   │   └── taxCalculator.ts  # Tax calculation engine
│   ├── hooks/                # Custom React hooks
│   │   ├── useDatabase.ts    # Database operation hooks with Firebase sync
│   │   ├── useEmployees.ts   # Employee management hooks
│   │   └── useAttendance.ts  # Attendance tracking hooks
│   ├── types/                # TypeScript type definitions
│   │   └── index.ts          # All application interfaces and types
│   ├── firebase.ts           # Firebase configuration and initialization
│   ├── main.tsx              # Application entry point
│   ├── App.tsx               # Main application component with page transitions
│   └── index.css             # Global styles, animations, and Tailwind imports
├── electron/                 # Desktop application files
│   ├── main.js               # Electron main process
│   ├── preload.js            # Electron preload script for security
│   └── package.json          # Electron-specific dependencies
├── scripts/                  # Build and deployment scripts
│   └── build-electron.js     # Automated desktop build script
├── public/                   # Static assets
├── dist/                     # Built application (generated)
└── Configuration Files
    ├── package.json          # Main project dependencies and scripts
    ├── vite.config.ts        # Vite configuration
    ├── tailwind.config.js    # Tailwind CSS configuration
    ├── tsconfig.json         # TypeScript configuration
    ├── eslint.config.js      # ESLint configuration
    └── postcss.config.js     # PostCSS configuration
```

## 🔧 Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager
- Firebase account (for cloud sync)

### Web Application Setup

1. **Clone the repository**:
```bash
git clone <repository-url>
cd arkive
```

2. **Install dependencies**:
```bash
npm install
```

3. **Start development server**:
```bash
npm run dev
```

4. **Build for production**:
```bash
npm run build
```

5. **Preview production build**:
```bash
npm run preview
```

### Firebase Setup

The application is pre-configured with Firebase. No additional setup is required for basic usage. The Firebase configuration includes:

- **Realtime Database**: Automatic sync for all data types
- **Security Rules**: Configured for authenticated access
- **Offline Support**: Automatic fallback to local storage

### Desktop Application Setup

1. **Build web application first**:
```bash
npm run build
```

2. **Automated desktop build**:
```bash
node scripts/build-electron.js
```

3. **Manual desktop build**:
```bash
cd electron
npm install
npm run build
```

## 🔐 Authentication & Security

### User Management
- **Admin Accounts**: Maximum 2 admin accounts allowed
- **Role-based Access**: Different permissions for admin vs employee
- **Session Management**: Secure session handling with 30-minute timeout
- **Firebase Sync**: All user data synchronized across devices

### Security Features
- Password-based authentication with minimum 6 characters
- Role-based access control with admin-only features
- Activity logging for comprehensive audit trails
- Secure local data storage with IndexedDB
- Real-time Firebase synchronization with conflict resolution
- Input validation and sanitization
- CNIC format validation (13 digits)
- Document encryption for secure vault storage

### Firebase Security
- **Device Tracking**: Each operation includes device ID for conflict resolution
- **Sync Queue**: Failed operations are retried automatically
- **Offline Support**: Local storage continues to work without internet
- **Real-time Updates**: Changes sync instantly across all connected devices

## 📊 Database Schema

### Users Table
- `id` (string) - Unique identifier
- `username` (string) - Login username (unique)
- `password` (string) - User password
- `role` ('admin' | 'employee') - User role
- `createdAt` (Date) - Account creation timestamp
- `lastLogin` (Date) - Last login timestamp
- `lastModified` (Date) - Last modification timestamp
- `syncedBy` (string) - Device ID that synced this record

### Clients Table
- `id` (string) - Unique identifier
- `name` (string) - Client full name
- `cnic` (string) - 13-digit CNIC number (unique)
- `password` (string) - Client password
- `type` ('IRIS' | 'SECP' | 'PRA' | 'Other') - Client type
- `phone` (string) - Contact phone number
- `email` (string) - Email address
- `notes` (string) - Additional notes
- `createdAt` (Date) - Registration timestamp
- `updatedAt` (Date) - Last update timestamp
- `lastModified` (Date) - Last modification timestamp
- `syncedBy` (string) - Device ID that synced this record

### Receipts Table
- `id` (string) - Unique identifier
- `clientName` (string) - Client name
- `clientCnic` (string) - Client CNIC (foreign key)
- `amount` (number) - Payment amount
- `natureOfWork` (string) - Work description
- `paymentMethod` ('cash' | 'bank_transfer' | 'cheque' | 'card' | 'online') - Payment method
- `date` (Date) - Payment date
- `createdAt` (Date) - Record creation timestamp
- `createdBy` (string) - User ID who created the record
- `lastModified` (Date) - Last modification timestamp
- `syncedBy` (string) - Device ID that synced this record

### Expenses Table
- `id` (string) - Unique identifier
- `description` (string) - Expense description
- `amount` (number) - Expense amount
- `category` ('office' | 'utilities' | 'supplies' | 'maintenance' | 'food' | 'rent' | 'salary' | 'other') - Expense category
- `date` (Date) - Expense date
- `createdAt` (Date) - Record creation timestamp
- `createdBy` (string) - User ID who created the record
- `lastModified` (Date) - Last modification timestamp
- `syncedBy` (string) - Device ID that synced this record

### Documents Table
- `id` (string) - Unique identifier
- `clientCnic` (string) - Associated client CNIC
- `fileName` (string) - Original file name
- `fileType` ('cnic' | 'tax_file' | 'contract' | 'invoice' | 'other') - Document type
- `fileSize` (number) - File size in bytes
- `mimeType` (string) - File MIME type
- `encryptedData` (string) - Base64 encrypted file data
- `tags` (string[]) - Document tags for organization
- `uploadedBy` (string) - User ID who uploaded the document
- `uploadedAt` (Date) - Upload timestamp
- `lastAccessed` (Date) - Last access timestamp
- `accessLog` (AccessLogEntry[]) - Access history
- `lastModified` (Date) - Last modification timestamp
- `syncedBy` (string) - Device ID that synced this record

### Employees Table
- `id` (string) - Unique identifier
- `employeeId` (string) - Employee ID (unique)
- `name` (string) - Employee full name
- `email` (string) - Email address
- `phone` (string) - Phone number
- `position` (string) - Job position
- `department` (string) - Department
- `salary` (number) - Monthly salary
- `joinDate` (Date) - Join date
- `status` ('active' | 'inactive' | 'terminated') - Employment status
- `username` (string) - Login username
- `password` (string) - Login password
- `role` ('employee' | 'manager') - Employee role
- `createdAt` (Date) - Record creation timestamp
- `updatedAt` (Date) - Last update timestamp
- `lastModified` (Date) - Last modification timestamp
- `syncedBy` (string) - Device ID that synced this record

### Attendance Table
- `id` (string) - Unique identifier
- `employeeId` (string) - Employee ID (foreign key)
- `date` (Date) - Attendance date
- `checkIn` (Date) - Check-in time
- `checkOut` (Date) - Check-out time
- `status` ('present' | 'absent' | 'late' | 'half-day' | 'leave') - Attendance status
- `notes` (string) - Additional notes
- `workingHours` (number) - Total working hours
- `createdAt` (Date) - Record creation timestamp
- `lastModified` (Date) - Last modification timestamp
- `syncedBy` (string) - Device ID that synced this record

### Activities Table (Local Only)
- `id` (string) - Unique identifier
- `userId` (string) - User who performed the action
- `action` (string) - Action type
- `details` (string) - Action details
- `timestamp` (Date) - Action timestamp

### Notifications Table
- `id` (string) - Unique identifier
- `message` (string) - Notification message
- `type` ('info' | 'warning' | 'error' | 'success') - Notification type
- `read` (boolean) - Read status
- `createdAt` (Date) - Creation timestamp
- `lastModified` (Date) - Last modification timestamp
- `syncedBy` (string) - Device ID that synced this record

## 🔄 Firebase Sync Features

### Real-time Synchronization
- **Instant Updates**: Changes appear immediately on all connected devices
- **Conflict Resolution**: Firebase data takes precedence to ensure consistency
- **Device Tracking**: Prevents infinite sync loops between devices
- **Retry Logic**: Failed sync operations are automatically retried

### Offline Support
- **Local Storage**: IndexedDB continues to work without internet connection
- **Sync Queue**: Changes are queued and synced when connection is restored
- **Automatic Recovery**: Seamless transition between offline and online modes
- **Data Integrity**: No data loss during connection interruptions

### Sync Controls
- **Manual Sync**: Force sync from Settings page
- **Sync Status**: Real-time connection and sync status indicators
- **Export/Import**: Backup and restore functionality for data migration
- **Device Management**: Each device has a unique identifier for tracking

## 🚀 Deployment Options

### Web Deployment
1. **Build the application**:
   ```bash
   npm run build
   ```
2. **Deploy the `dist` folder** to any web server
3. **Configure for SPA routing** if using subdirectories
4. **Set up HTTPS** for production environments
5. **Firebase is pre-configured** - no additional setup required

### Desktop Deployment
1. **Build desktop application**:
   ```bash
   node scripts/build-electron.js
   ```
2. **Distribute executable files** from `electron/dist/`
3. **No additional installation** required for end users
4. **Code signing** recommended for production distribution

## 📝 Default Credentials

For initial setup and testing:
- **Username**: admin
- **Password**: admin123

**Note**: Change default credentials immediately in production environments.

## 🔧 Development Workflow

### Code Organization
- **Components**: Organized by functionality with clear separation of concerns
- **Services**: Business logic separated from UI components with Firebase integration
- **Hooks**: Reusable state management with real-time sync
- **Types**: Comprehensive TypeScript interfaces
- **Firebase**: Centralized sync service with error handling

### Best Practices
- **TypeScript**: Full type safety throughout the application
- **ESLint**: Code quality and consistency enforcement
- **Component Structure**: Functional components with hooks
- **State Management**: Context API for global state with Firebase sync
- **Error Handling**: Comprehensive error handling for sync operations

### Performance Optimizations
- **Lazy Loading**: Components loaded on demand
- **Efficient Queries**: Optimized IndexedDB and Firebase operations
- **Real-time Updates**: Minimal re-renders with smart state management
- **Memory Management**: Proper cleanup of listeners and subscriptions

## 🐛 Troubleshooting

### Common Issues

1. **Sync Issues**: Check internet connection and Firebase status
2. **Login Errors**: Verify credentials and check for account limits
3. **Data Not Appearing**: Wait for Firebase sync or refresh the page
4. **Performance Issues**: Clear browser cache and restart application
5. **Form Errors**: Ensure all required fields are filled correctly

### Firebase Troubleshooting

1. **Connection Issues**: Check Firebase console for service status
2. **Sync Delays**: Allow up to 30 seconds for sync completion
3. **Data Conflicts**: Firebase data takes precedence over local changes
4. **Offline Mode**: Local storage continues to work without internet

### Support

For technical support and bug reports:
1. Check the browser console for error messages
2. Verify Firebase connection status in Settings
3. Try manual sync from Settings page
4. Clear application data and restart
5. Contact system administrator

## 📄 Dependencies

### Main Dependencies
- **react**: ^18.3.1 - Core React library
- **react-dom**: ^18.3.1 - React DOM rendering
- **typescript**: ^5.8.3 - TypeScript support
- **vite**: ^5.4.2 - Build tool and dev server
- **tailwindcss**: ^3.4.1 - CSS framework
- **lucide-react**: ^0.344.0 - Icon library
- **recharts**: ^3.1.0 - Chart library
- **date-fns**: ^4.1.0 - Date utilities
- **xlsx**: ^0.18.5 - Excel file handling
- **clsx**: ^2.1.1 - Conditional class names
- **firebase**: ^12.0.0 - Firebase SDK for real-time sync

### Development Dependencies
- **@vitejs/plugin-react**: ^4.3.1 - Vite React plugin
- **eslint**: ^9.9.1 - Code linting
- **autoprefixer**: ^10.4.18 - CSS prefixing
- **postcss**: ^8.4.35 - CSS processing

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:
1. Fork the repository
2. Create a feature branch
3. Make your changes with proper TypeScript types
4. Test thoroughly including Firebase sync functionality
5. Submit a pull request with detailed description

## 📞 Support & Maintenance

This application is designed for production use with:
- Real-time Firebase synchronization across all devices
- Automatic conflict resolution and data consistency
- Comprehensive error handling and retry logic
- Regular security updates and performance monitoring
- User training and documentation
- Technical support availability

---

**Built with ❤️ using React, TypeScript, Firebase, and modern web technologies. Enhanced with real-time synchronization and comprehensive data management.**