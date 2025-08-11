import { useState, useEffect } from 'react';
import { db } from '../services/database';
import { firebaseSync } from '../services/firebaseSync';
import { Client, Receipt, Expense, Activity, Notification, Document } from '../types';
import { useEmployees } from './useEmployees';
import { useAttendance } from './useAttendance';

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = async () => {
    try {
      const data = await db.getAllClients();
      setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    
    // Setup realtime listener
    firebaseSync.setupRealtimeListener('clients', (remoteData: Client[]) => {
      if (remoteData.length >= 0) { // Allow empty arrays
        setClients(prevClients => {
          const clientMap = new Map(prevClients.map(c => [c.id, c]));
          
          // Merge remote data (Firebase takes precedence)
          remoteData.forEach(remoteClient => {
            clientMap.set(remoteClient.id, remoteClient);
          });
          
          return Array.from(clientMap.values()).sort((a, b) => 
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        });
        console.log(`✅ Clients updated from Firebase: ${remoteData.length} items`);
      }
    });

    return () => {
      firebaseSync.removeRealtimeListener('clients');
    };
  }, []);

  const createClient = async (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newClient = await db.createClient(client);
      setClients(prev => [newClient, ...prev]);
      return newClient;
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  };

  const updateClient = async (client: Client) => {
    try {
      await db.updateClient(client);
      setClients(prev => prev.map(c => c.id === client.id ? client : c));
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  };

  return { clients, loading, createClient, updateClient, refetch: fetchClients };
}

export function useReceipts() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReceipts = async () => {
    try {
      const data = await db.getAllReceipts();
      setReceipts(data);
    } catch (error) {
      console.error('Error fetching receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
    
    // Setup realtime listener
    firebaseSync.setupRealtimeListener('receipts', (remoteData: Receipt[]) => {
      if (remoteData.length >= 0) { // Allow empty arrays
        setReceipts(prevReceipts => {
          const receiptMap = new Map(prevReceipts.map(r => [r.id, r]));
          
          // Merge remote data (Firebase takes precedence)
          remoteData.forEach(remoteReceipt => {
            receiptMap.set(remoteReceipt.id, remoteReceipt);
          });
          
          return Array.from(receiptMap.values()).sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
        console.log(`✅ Receipts updated from Firebase: ${remoteData.length} items`);
      }
    });

    return () => {
      firebaseSync.removeRealtimeListener('receipts');
    };
  }, []);

  const createReceipt = async (receipt: Omit<Receipt, 'id' | 'createdAt'>) => {
    try {
      const newReceipt = await db.createReceipt(receipt);
      setReceipts(prev => [newReceipt, ...prev]);
      return newReceipt;
    } catch (error) {
      console.error('Error creating receipt:', error);
      throw error;
    }
  };

  const getReceiptsByClient = async (clientCnic: string) => {
    try {
      return await db.getReceiptsByClient(clientCnic);
    } catch (error) {
      console.error('Error fetching client receipts:', error);
      return [];
    }
  };

  const deleteReceipt = async (id: string) => {
    try {
      await db.deleteReceipt(id);
      setReceipts(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting receipt:', error);
      throw error;
    }
  };

  return { receipts, loading, createReceipt, getReceiptsByClient, deleteReceipt, refetch: fetchReceipts };
}

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = async () => {
    try {
      const data = await db.getAllExpenses();
      setExpenses(data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
    
    // Setup realtime listener
    firebaseSync.setupRealtimeListener('expenses', (remoteData: Expense[]) => {
      if (remoteData.length >= 0) { // Allow empty arrays
        setExpenses(prevExpenses => {
          const expenseMap = new Map(prevExpenses.map(e => [e.id, e]));
          
          // Merge remote data (Firebase takes precedence)
          remoteData.forEach(remoteExpense => {
            expenseMap.set(remoteExpense.id, remoteExpense);
          });
          
          return Array.from(expenseMap.values()).sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
        console.log(`✅ Expenses updated from Firebase: ${remoteData.length} items`);
      }
    });

    return () => {
      firebaseSync.removeRealtimeListener('expenses');
    };
  }, []);

  const createExpense = async (expense: Omit<Expense, 'id' | 'createdAt'>) => {
    try {
      const newExpense = await db.createExpense(expense);
      setExpenses(prev => [newExpense, ...prev]);
      return newExpense;
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
  };

  return { expenses, loading, createExpense, refetch: fetchExpenses };
}

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    try {
      const data = await db.getAllActivities();
      setActivities(data.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  return { activities, loading, refetch: fetchActivities };
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const data = await db.getAllNotifications();
      setNotifications(data.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Setup realtime listener
    firebaseSync.setupRealtimeListener('notifications', (remoteData: Notification[]) => {
      if (remoteData.length >= 0) { // Allow empty arrays
        setNotifications(prevNotifications => {
          const notificationMap = new Map(prevNotifications.map(n => [n.id, n]));
          
          // Merge remote data (Firebase takes precedence)
          remoteData.forEach(remoteNotification => {
            notificationMap.set(remoteNotification.id, remoteNotification);
          });
          
          return Array.from(notificationMap.values()).sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
        console.log(`✅ Notifications updated from Firebase: ${remoteData.length} items`);
      }
    });

    return () => {
      firebaseSync.removeRealtimeListener('notifications');
    };
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await db.markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await db.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  };

  return { notifications, loading, markAsRead, markAllAsRead, refetch: fetchNotifications };
}

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = async () => {
    try {
      const data = await db.getAllDocuments();
      setDocuments(data.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime()));
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    
    // Setup realtime listener
    firebaseSync.setupRealtimeListener('documents', (remoteData: Document[]) => {
      if (remoteData.length >= 0) { // Allow empty arrays
        setDocuments(prevDocuments => {
          const documentMap = new Map(prevDocuments.map(d => [d.id, d]));
          
          // Merge remote data (Firebase takes precedence)
          remoteData.forEach(remoteDocument => {
            documentMap.set(remoteDocument.id, remoteDocument);
          });
          
          return Array.from(documentMap.values()).sort((a, b) => 
            new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
          );
        });
        console.log(`✅ Documents updated from Firebase: ${remoteData.length} items`);
      }
    });

    return () => {
      firebaseSync.removeRealtimeListener('documents');
    };
  }, []);

  const createDocument = async (document: Omit<Document, 'id' | 'uploadedAt' | 'accessLog'>) => {
    try {
      const newDocument = await db.createDocument(document);
      setDocuments(prev => [newDocument, ...prev]);
      return newDocument;
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  };

  const getDocumentsByClient = async (clientCnic: string) => {
    try {
      return await db.getDocumentsByClient(clientCnic);
    } catch (error) {
      console.error('Error fetching client documents:', error);
      return [];
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      await db.deleteDocument(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  };

  const logAccess = async (documentId: string, userId: string, action: 'view' | 'download') => {
    try {
      await db.logDocumentAccess(documentId, userId, action);
      fetchDocuments(); // Refresh to show updated access log
    } catch (error) {
      console.error('Error logging document access:', error);
    }
  };

  return { 
    documents, 
    loading, 
    createDocument, 
    getDocumentsByClient, 
    deleteDocument, 
    logAccess, 
    refetch: fetchDocuments 
  };
}

export function useDatabase() {
  const clients = useClients();
  const receipts = useReceipts();
  const expenses = useExpenses();
  const notifications = useNotifications();
  const documents = useDocuments();
  const employees = useEmployees();
  const attendanceHook = useAttendance();

  return {
    // Clients
    clients: clients.clients,
    clientsLoading: clients.loading,
    createClient: clients.createClient,
    updateClient: clients.updateClient,
    refetchClients: clients.refetch,

    // Receipts
    receipts: receipts.receipts,
    receiptsLoading: receipts.loading,
    createReceipt: receipts.createReceipt,
    getReceiptsByClient: receipts.getReceiptsByClient,
    deleteReceipt: receipts.deleteReceipt,
    refetchReceipts: receipts.refetch,

    // Expenses
    expenses: expenses.expenses,
    expensesLoading: expenses.loading,
    createExpense: expenses.createExpense,
    refetchExpenses: expenses.refetch,

    // Notifications
    notifications: notifications.notifications,
    notificationsLoading: notifications.loading,
    markNotificationAsRead: notifications.markAsRead,
    markAllNotificationsAsRead: notifications.markAllAsRead,
    refetchNotifications: notifications.refetch,

    // Documents
    documents: documents.documents,
    documentsLoading: documents.loading,
    createDocument: documents.createDocument,
    getDocumentsByClient: documents.getDocumentsByClient,
    deleteDocument: documents.deleteDocument,
    logDocumentAccess: documents.logAccess,
    refetchDocuments: documents.refetch,

    // Employees
    employees: employees.employees,
    employeesLoading: employees.loading,
    createEmployee: employees.createEmployee,
    updateEmployee: employees.updateEmployee,
    deleteEmployee: employees.deleteEmployee,
    refetchEmployees: employees.refetch,

    // Attendance
    attendance: attendanceHook.attendance,
    attendanceLoading: attendanceHook.loading,
    markAttendance: attendanceHook.markAttendance,
    getEmployeeAttendance: attendanceHook.getEmployeeAttendance,
    updateAttendance: attendanceHook.updateAttendance,
    refetchAttendance: attendanceHook.refetch,
  };
}