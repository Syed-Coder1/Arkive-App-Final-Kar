import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Eye, 
  Download, 
  Trash2, 
  Edit, 
  Users, 
  X, 
  Receipt,
  Calendar,
  DollarSign,
  CreditCard,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useClients, useReceipts } from '../hooks/useDatabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { exportService } from '../services/export';
import { firebaseSync } from '../services/firebaseSync';
import { db } from '../services/database';

interface ClientsProps {
  showForm?: boolean;
  onCloseForm?: () => void;
}

export function Clients({ showForm: externalShowForm, onCloseForm }: ClientsProps) {
  const { clients: localClients, createClient, updateClient, loading } = useClients();
  const { getReceiptsByClient } = useReceipts();
  const { user } = useAuth();

  // Local state for UI
  const [clients, setClients] = useState<any[]>([]);
  const [showForm, setShowForm] = useState<boolean>(externalShowForm || false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showClientDetails, setShowClientDetails] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientReceipts, setClientReceipts] = useState<any[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    cnic: '',
    password: '',
    type: 'Other' as 'IRIS' | 'SECP' | 'PRA' | 'Other',
    phone: '',
    email: '',
    notes: '',
  });

  // Merge remote data safely
  const mergeRemoteClients = (remoteItems: any[]) => {
    if (!Array.isArray(remoteItems)) return;

    const map = new Map<string, any>();
    
    // Add current clients to map
    clients.forEach((c) => {
      if (c && c.id !== undefined) map.set(String(c.id), c);
    });

    // Merge remote data (remote takes precedence)
    remoteItems.forEach((c) => {
      if (c && c.id !== undefined) {
        map.set(String(c.id), c);
      }
    });

    // Sort by updated date descending
    const merged = Array.from(map.values()).sort((a, b) => {
      const ta = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt).getTime();
      const tb = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt).getTime();
      return tb - ta;
    });

    setClients(merged);
  };

  // Sync local clients to UI
  useEffect(() => {
    if (!Array.isArray(localClients)) {
      setClients([]);
      return;
    }
    
    const map = new Map<string, any>();
    
    // Keep existing clients (might have Firebase data)
    clients.forEach((c) => {
      if (c && c.id !== undefined) map.set(String(c.id), c);
    });

    // Add local clients (but don't overwrite Firebase data)
    localClients.forEach((lc) => {
      if (lc && lc.id !== undefined && !map.has(String(lc.id))) {
        map.set(String(lc.id), lc);
      }
    });

    const merged = Array.from(map.values()).sort((a, b) => {
      const ta = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt).getTime();
      const tb = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt).getTime();
      return tb - ta;
    });

    setClients(merged);
  }, [localClients]);

  // Setup Firebase realtime listener
  useEffect(() => {
    if (!user?.id) return;

    let mounted = true;

    try {
      firebaseSync.setupRealtimeListener('clients', (remoteData: any[]) => {
        if (!mounted) return;
        try {
          console.log('📡 Realtime clients from Firebase:', remoteData.length);
          mergeRemoteClients(remoteData);
        } catch (error) {
          console.error('Error processing realtime clients:', error);
        }
      });
    } catch (error) {
      console.error('Failed to start realtime clients listener:', error);
    }

    return () => {
      mounted = false;
      firebaseSync.removeRealtimeListener('clients');
    };
  }, [user?.id]);

  // Handle external form control
  useEffect(() => {
    if (externalShowForm !== undefined) {
      setShowForm(externalShowForm);
    }
  }, [externalShowForm]);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      cnic: '',
      password: '',
      type: 'Other',
      phone: '',
      email: '',
      notes: '',
    });
    setEditingClient(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!/^\d{13}$/.test(formData.cnic)) {
      showMessage('CNIC must be exactly 13 digits', 'error');
      return;
    }

    // Check for duplicate CNIC (excluding current client if editing)
    const existingClient = clients.find(c => 
      c.cnic === formData.cnic && (!editingClient || c.id !== editingClient.id)
    );
    
    if (existingClient) {
      showMessage('A client with this CNIC already exists', 'error');
      return;
    }

    try {
      if (editingClient) {
        // Update existing client
        const updatedClient = { ...editingClient, ...formData, updatedAt: new Date() };
        await updateClient(updatedClient);
        
        // Update UI immediately
        setClients(prev => prev.map(c => c.id === editingClient.id ? updatedClient : c));
        showMessage('Client updated successfully!', 'success');
      } else {
        // Create new client
        const saved = await createClient(formData);
        
        // Update UI immediately
        setClients(prev => [saved, ...prev]);
        showMessage('Client created successfully!', 'success');
      }

      resetForm();
      setShowForm(false);
      if (onCloseForm) onCloseForm();
    } catch (error) {
      console.error('Error saving client:', error);
      showMessage('Error saving client. Please try again.', 'error');
    }
  };

  const handleEdit = (client: any) => {
    setFormData({
      name: client.name,
      cnic: client.cnic,
      phone: client.phone || '',
      email: client.email || '',
      password: client.password || '',
      type: client.type,
      notes: client.notes || '',
    });
    setEditingClient(client);
    setShowForm(true);
  };

  const handleDelete = async (clientId: string, clientName: string) => {
    if (confirm(`Are you sure you want to delete client "${clientName}"? This action cannot be undone.`)) {
      try {
        await db.deleteClient(clientId);
        
        // Update UI immediately
        setClients(prev => prev.filter(c => c.id !== clientId));
        showMessage('Client deleted successfully!', 'success');
        
        // Log activity
        await db.createActivity({
          userId: user!.id,
          action: 'delete_client',
          details: `Deleted client ${clientName} (ID: ${clientId})`,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error('Error deleting client:', error);
        showMessage('Error deleting client. Please try again.', 'error');
      }
    }
  };

  const handleViewMore = async (client: any) => {
    try {
      const receipts = await getReceiptsByClient(client.cnic);
      setClientReceipts(receipts);
      setSelectedClient(client);
      setShowClientDetails(true);
    } catch (error) {
      console.error('Error fetching client receipts:', error);
      showMessage('Error loading client details', 'error');
    }
  };

  const handleExportClientHistory = async (client: any) => {
    try {
      await exportService.exportClientPaymentHistory(client, clientReceipts);
      showMessage('Client payment history exported successfully!', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showMessage('Error exporting client history', 'error');
    }
  };

  // Filter clients
  const filteredClients = clients.filter(client => {
    const searchLower = searchTerm.toLowerCase();
    return !searchTerm ||
      client.name.toLowerCase().includes(searchLower) ||
      client.cnic.includes(searchTerm) ||
      (client.phone || '').includes(searchTerm) ||
      (client.email || '').toLowerCase().includes(searchLower);
  });

  // Calculate client stats
  const totalClients = clients.length;
  const activeClients = clients.filter(c => {
    // Consider client active if they have receipts in last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return true; // For now, all clients are considered active
  }).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
        } animate-slideInRight`}>
          <div className="flex items-center">
            {message.type === 'success' ? <CheckCircle className="w-5 h-5 mr-2" /> : <AlertCircle className="w-5 h-5 mr-2" />}
            {message.text}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" />
            Client Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Total Clients: {totalClients} • Active: {activeClients}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportService.exportClientsToExcel(clients)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-300 hover:scale-105"
          >
            <Download size={20} />
            Export
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 hover:scale-105"
          >
            <Plus size={20} />
            New Client
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover-lift">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Clients</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalClients}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover-lift">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">IRIS Clients</p>
              <p className="text-2xl font-bold text-green-600">
                {clients.filter(c => c.type === 'IRIS').length}
              </p>
            </div>
            <Receipt className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover-lift">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">SECP Clients</p>
              <p className="text-2xl font-bold text-purple-600">
                {clients.filter(c => c.type === 'SECP').length}
              </p>
            </div>
            <Receipt className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover-lift">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">PRA Clients</p>
              <p className="text-2xl font-bold text-orange-600">
                {clients.filter(c => c.type === 'PRA').length}
              </p>
            </div>
            <Receipt className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, CNIC, phone, or email..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-300"
          />
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  CNIC
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {client.name}
                      </div>
                      {client.notes && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                          {client.notes}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {client.cnic}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      client.type === 'IRIS' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                      client.type === 'SECP' ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200' :
                      client.type === 'PRA' ? 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200' :
                      'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200'
                    }`}>
                      {client.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    <div>
                      {client.phone && <div>{client.phone}</div>}
                      {client.email && <div className="text-xs text-gray-500 dark:text-gray-400">{client.email}</div>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {format(client.createdAt instanceof Date ? client.createdAt : new Date(client.createdAt), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewMore(client)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 transition-colors duration-200"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleEdit(client)}
                        className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 transition-colors duration-200"
                        title="Edit Client"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(client.id, client.name)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors duration-200"
                        title="Delete Client"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredClients.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No clients found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {clients.length === 0
                ? "Create your first client to get started"
                : "Try adjusting your search criteria"
              }
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300"
            >
              <Plus size={20} />
              Create Client
            </button>
          </div>
        )}
      </div>

      {/* Client Form Modal */}
      {showForm && (
        <div className="form-modal">
          <div className="form-container animate-slideInRight">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              {editingClient ? 'Edit Client' : 'New Client'}
            </h2>

            <div className="max-h-[60vh] overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter client's full name"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    CNIC *
                  </label>
                  <input
                    type="text"
                    value={formData.cnic}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 13);
                      setFormData({ ...formData, cnic: value });
                    }}
                    placeholder="Enter 13-digit CNIC"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-300"
                    maxLength={13}
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Must be exactly 13 digits
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Client Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-300"
                    required
                  >
                    <option value="IRIS">IRIS</option>
                    <option value="SECP">SECP</option>
                    <option value="PRA">PRA</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter phone number"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingClient ? "Leave blank to keep current password" : "Enter password"}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-300"
                    required={!editingClient}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes about the client"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-300"
                  />
                </div>
              </form>
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                  if (onCloseForm) {
                    onCloseForm();
                  }
                }}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300"
              >
                {editingClient ? 'Update Client' : 'Create Client'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client Details Modal */}
      {showClientDetails && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-slideInRight">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Eye className="w-6 h-6" />
                  Client Details
                </h2>
                <button
                  onClick={() => setShowClientDetails(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Client Information */}
                <div className="lg:col-span-1">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Client Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400">Name</label>
                        <p className="font-medium text-gray-900 dark:text-white">{selectedClient.name}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400">CNIC</label>
                        <p className="font-medium text-gray-900 dark:text-white">{selectedClient.cnic}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400">Type</label>
                        <p className="font-medium text-gray-900 dark:text-white">{selectedClient.type}</p>
                      </div>
                      {selectedClient.phone && (
                        <div>
                          <label className="text-sm text-gray-500 dark:text-gray-400">Phone</label>
                          <p className="font-medium text-gray-900 dark:text-white">{selectedClient.phone}</p>
                        </div>
                      )}
                      {selectedClient.email && (
                        <div>
                          <label className="text-sm text-gray-500 dark:text-gray-400">Email</label>
                          <p className="font-medium text-gray-900 dark:text-white">{selectedClient.email}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400">Created</label>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {format(selectedClient.createdAt instanceof Date ? selectedClient.createdAt : new Date(selectedClient.createdAt), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      {selectedClient.notes && (
                        <div>
                          <label className="text-sm text-gray-500 dark:text-gray-400">Notes</label>
                          <p className="font-medium text-gray-900 dark:text-white">{selectedClient.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Payment Summary */}
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Payment Summary</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Total Payments:</span>
                          <span className="font-bold text-green-600 dark:text-green-400">
                            Rs. {clientReceipts.reduce((sum, r) => sum + r.amount, 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Total Receipts:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {clientReceipts.length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Average Payment:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            Rs. {clientReceipts.length > 0 ? 
                              Math.round(clientReceipts.reduce((sum, r) => sum + r.amount, 0) / clientReceipts.length).toLocaleString() 
                              : 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleExportClientHistory(selectedClient)}
                      className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-300"
                    >
                      <Download size={16} />
                      Export Payment History
                    </button>
                  </div>
                </div>

                {/* Payment History */}
                <div className="lg:col-span-2">
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Receipt className="w-5 h-5" />
                        Payment History ({clientReceipts.length} receipts)
                      </h3>
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto">
                      {clientReceipts.length > 0 ? (
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Date
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Amount
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Payment Method
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Work
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {clientReceipts.map((receipt) => (
                              <tr key={receipt.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                  {format(receipt.date instanceof Date ? receipt.date : new Date(receipt.date), 'MMM dd, yyyy')}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-green-600 dark:text-green-400">
                                  Rs. {receipt.amount.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 capitalize">
                                    {receipt.paymentMethod.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                  <div className="max-w-xs truncate" title={receipt.natureOfWork}>
                                    {receipt.natureOfWork || '-'}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="text-center py-8">
                          <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-500 dark:text-gray-400">No payment history found</p>
                          <p className="text-sm text-gray-400 dark:text-gray-500">
                            Receipts will appear here when payments are recorded
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}