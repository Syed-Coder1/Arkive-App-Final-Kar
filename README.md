# Arkive - Secure Tax Office Management System

A comprehensive, production-ready tax office management system with real-time Firebase synchronization, secure authentication, and cross-device collaboration.

## 🚀 Key Features

### Core Functionality
- 🔐 **Secure Authentication** - Maximum 2 admin accounts with session management
- 📊 **Real-time Dashboard** - Live charts and statistics with Firebase sync
- 🧾 **Receipt Management** - CRUD operations with auto-client creation
- 👥 **Client Management** - Complete profiles with payment history
- 💰 **Expense Tracking** - Categorized expense management
- 📈 **Advanced Analytics** - Business insights and performance metrics
- 🔒 **Secure Vault** - Encrypted document storage
- 👨‍💼 **Employee Management** - HR system with attendance tracking
- 🧮 **Tax Calculator** - FBR-compliant calculations for 2025-26

### Firebase Integration
- 🔄 **Real-time Sync** - Instant updates across all devices
- 📱 **Cross-device Collaboration** - Multiple users, same data
- 🌐 **Offline Support** - Works offline with auto-sync when online
- 🔒 **Duplicate Prevention** - Secure data integrity
- 📊 **Activity Logging** - Complete audit trail

## 🔥 Firebase Database Structure

### Authentication & Users
```
users/
├── {userId}/
│   ├── id: string
│   ├── username: string (unique)
│   ├── password: string
│   ├── role: "admin" | "employee"
│   ├── createdAt: ISO string
│   ├── lastLogin: ISO string
│   ├── lastModified: ISO string
│   └── syncedBy: deviceId
```

### Client Management
```
clients/
├── {clientId}/
│   ├── id: string
│   ├── name: string
│   ├── cnic: string (13 digits, unique)
│   ├── password: string
│   ├── type: "IRIS" | "SECP" | "PRA" | "Other"
│   ├── phone: string
│   ├── email: string
│   ├── notes: string
│   ├── createdAt: ISO string
│   ├── updatedAt: ISO string
│   ├── lastModified: ISO string
│   └── syncedBy: deviceId
```

### Receipt Management
```
receipts/
├── {receiptId}/
│   ├── id: string
│   ├── clientName: string
│   ├── clientCnic: string (links to client)
│   ├── amount: number
│   ├── natureOfWork: string
│   ├── paymentMethod: "cash" | "bank_transfer" | "cheque" | "card" | "online"
│   ├── date: ISO string
│   ├── createdAt: ISO string
│   ├── createdBy: userId
│   ├── lastModified: ISO string
│   └── syncedBy: deviceId
```

### Expense Tracking
```
expenses/
├── {expenseId}/
│   ├── id: string
│   ├── description: string
│   ├── amount: number
│   ├── category: "office" | "utilities" | "supplies" | "maintenance" | "food" | "rent" | "salary" | "other"
│   ├── date: ISO string
│   ├── createdAt: ISO string
│   ├── createdBy: userId
│   ├── lastModified: ISO string
│   └── syncedBy: deviceId
```

### Document Vault
```
documents/
├── {documentId}/
│   ├── id: string
│   ├── clientCnic: string
│   ├── fileName: string
│   ├── fileType: "cnic" | "tax_file" | "contract" | "invoice" | "other"
│   ├── fileSize: number
│   ├── mimeType: string
│   ├── encryptedData: string (base64)
│   ├── tags: string[]
│   ├── uploadedBy: userId
│   ├── uploadedAt: ISO string
│   ├── lastAccessed: ISO string
│   ├── accessLog: AccessLogEntry[]
│   ├── lastModified: ISO string
│   └── syncedBy: deviceId
```

### Employee Management
```
employees/
├── {employeeId}/
│   ├── id: string
│   ├── employeeId: string (unique)
│   ├── name: string
│   ├── email: string
│   ├── phone: string
│   ├── position: string
│   ├── department: string
│   ├── salary: number
│   ├── joinDate: ISO string
│   ├── status: "active" | "inactive" | "terminated"
│   ├── username: string
│   ├── password: string
│   ├── role: "employee" | "manager"
│   ├── createdAt: ISO string
│   ├── updatedAt: ISO string
│   ├── lastModified: ISO string
│   └── syncedBy: deviceId
```

### Attendance Tracking
```
attendance/
├── {attendanceId}/
│   ├── id: string
│   ├── employeeId: string
│   ├── date: ISO string
│   ├── checkIn: ISO string
│   ├── checkOut: ISO string
│   ├── status: "present" | "absent" | "late" | "half-day" | "leave"
│   ├── notes: string
│   ├── workingHours: number
│   ├── createdAt: ISO string
│   ├── lastModified: ISO string
│   └── syncedBy: deviceId
```

### Notifications
```
notifications/
├── {notificationId}/
│   ├── id: string
│   ├── message: string
│   ├── type: "info" | "warning" | "error" | "success"
│   ├── read: boolean
│   ├── createdAt: ISO string
│   ├── lastModified: ISO string
│   └── syncedBy: deviceId
```

### Sync Metadata
```
sync_metadata/
├── {deviceId}/
│   └── lastSync: ISO string
```

## 🔧 Firebase Configuration

### Database URL
```
https://arkive-da661-default-rtdb.asia-southeast1.firebasedatabase.app/
```

### Security Rules
```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    "users": {
      ".indexOn": ["username", "role"]
    },
    "clients": {
      ".indexOn": ["cnic", "name", "type"]
    },
    "receipts": {
      ".indexOn": ["clientCnic", "date", "createdBy"]
    },
    "expenses": {
      ".indexOn": ["category", "date", "createdBy"]
    },
    "documents": {
      ".indexOn": ["clientCnic", "fileType", "uploadedBy"]
    },
    "employees": {
      ".indexOn": ["employeeId", "status", "department"]
    },
    "attendance": {
      ".indexOn": ["employeeId", "date", "status"]
    },
    "notifications": {
      ".indexOn": ["read", "type", "createdAt"]
    }
  }
}
```

## 🔄 Sync Mechanism

### Real-time Synchronization
1. **Local Changes** → Sync Queue → Firebase
2. **Firebase Changes** → Real-time Listeners → Local State
3. **Conflict Resolution** → Firebase data takes precedence
4. **Device Tracking** → Prevents infinite sync loops

### Offline Support
- **Local Storage**: IndexedDB continues to work offline
- **Sync Queue**: Changes are queued and synced when online
- **Automatic Recovery**: Seamless transition between offline/online
- **Data Integrity**: No data loss during connection interruptions

### Duplicate Prevention
- **Unique Device IDs**: Each device has a unique identifier
- **Operation Deduplication**: Prevents duplicate sync operations
- **Conflict Resolution**: Firebase data wins in conflicts
- **Retry Logic**: Failed operations are retried with exponential backoff

## 🔐 Authentication System

### Account Limits
- **Maximum 2 Admin Accounts**: Strictly enforced
- **Default Account**: admin/admin123
- **User-created Account**: One additional admin account allowed
- **Session Management**: 30-minute timeout with monitoring

### Security Features
- **Password Validation**: Minimum 6 characters
- **Session Tracking**: Activity logging for all actions
- **Device Identification**: Each login tracked by device
- **Auto-logout**: Session timeout protection

## 📊 Auto-Client Creation

When adding a receipt:
1. **CNIC Check**: System checks if client exists
2. **Auto-creation**: If not found, creates client automatically
3. **Default Values**: Uses receipt data for client profile
4. **Password Generation**: Auto-generates secure password
5. **Firebase Sync**: Immediately syncs new client

## 👥 Client Details & Payment History

### View More Features
- **Complete Profile**: All client information
- **Payment Summary**: Total payments, receipt count, averages
- **Payment History**: Chronological list of all receipts
- **Export Options**: Excel export of payment history
- **Real-time Updates**: Live sync across devices

### Payment Analytics
- **Total Revenue**: Sum of all client payments
- **Payment Frequency**: Receipt count and timing
- **Average Payment**: Mean payment amount
- **Payment Methods**: Breakdown by payment type

## 🗑️ Receipt Deletion

### Secure Deletion
- **Confirmation Dialog**: Prevents accidental deletion
- **Activity Logging**: All deletions are logged
- **Firebase Sync**: Deletions sync across devices
- **Audit Trail**: Complete record of who deleted what

### Deletion Process
1. **User Confirmation**: Double-check with user
2. **Local Deletion**: Remove from IndexedDB
3. **Firebase Deletion**: Remove from Firebase
4. **Activity Log**: Record deletion event
5. **UI Update**: Immediate UI refresh

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- Firebase account
- Modern web browser

### Quick Start
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Firebase Setup
The application is pre-configured with Firebase. No additional setup required.

### Default Login
- **Username**: admin
- **Password**: admin123

## 🔧 Development

### Project Structure
```
src/
├── components/          # React components
├── contexts/           # React contexts
├── services/           # Business logic
├── hooks/              # Custom hooks
├── types/              # TypeScript types
└── firebase.ts         # Firebase configuration
```

### Key Services
- **firebaseSync.ts**: Real-time synchronization
- **database.ts**: IndexedDB operations
- **auth.ts**: Authentication management
- **export.ts**: Excel export functionality

## 🚀 Deployment

### Web Deployment
```bash
npm run build
# Deploy dist/ folder to web server
```

### Desktop Application
```bash
node scripts/build-electron.js
# Executable files in electron/dist/
```

## 🔒 Security Features

### Data Protection
- **Encryption**: Document vault uses AES encryption
- **Access Logging**: All document access is logged
- **Session Security**: Automatic timeout and monitoring
- **Device Tracking**: Each device identified uniquely

### Firebase Security
- **Authentication Required**: All operations require auth
- **Role-based Access**: Admin vs employee permissions
- **Data Validation**: Input validation on all forms
- **Audit Trail**: Complete activity logging

## 📱 Cross-Device Sync

### Real-time Features
- **Instant Updates**: Changes appear immediately on all devices
- **Conflict Resolution**: Firebase data takes precedence
- **Connection Monitoring**: Real-time connection status
- **Automatic Recovery**: Seamless reconnection handling

### Sync Status Indicators
- **Online/Offline**: Connection status display
- **Sync Queue**: Pending operations counter
- **Last Sync**: Timestamp of last successful sync
- **Device ID**: Unique identifier for each device

## 🐛 Troubleshooting

### Common Issues
1. **Sync Delays**: Allow up to 30 seconds for sync completion
2. **Login Errors**: Check username/password and account limits
3. **Connection Issues**: Verify internet connection and Firebase status
4. **Data Conflicts**: Firebase data takes precedence over local

### Error Resolution
1. **Clear Browser Cache**: Refresh application data
2. **Force Sync**: Use Settings → Sync & Backup → Force Sync
3. **Export/Import**: Backup data before troubleshooting
4. **Wipe Data**: Last resort - clears all data

## 📞 Support

### Getting Help
- Check browser console for error messages
- Verify Firebase connection in Settings
- Try manual sync from Settings page
- Export data before major changes

### Technical Details
- **Database**: IndexedDB + Firebase Realtime Database
- **Authentication**: Custom auth with Firebase sync
- **Real-time**: Firebase listeners with conflict resolution
- **Offline**: IndexedDB with sync queue

---

**Built with React, TypeScript, Firebase, and modern web technologies for secure, real-time tax office management.**