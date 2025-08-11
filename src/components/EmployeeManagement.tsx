import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  Users, 
  X, 
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  UserPlus,
  Badge,
  Phone,
  Mail,
  Building,
  DollarSign,
  Shield,
  User
} from 'lucide-react';
import { useEmployees, useAttendance } from '../hooks/useDatabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { db } from '../services/database';

const MAX_EMPLOYEES = 10;

export function EmployeeManagement() {
  const { employees, createEmployee, updateEmployee, deleteEmployee, loading } = useEmployees();
  const { attendance, markAttendance, getEmployeeAttendance } = useAttendance();
  const { user } = useAuth();
  
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [employeeAttendance, setEmployeeAttendance] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    salary: '',
    joinDate: format(new Date(), 'yyyy-MM-dd'),
    status: 'active' as 'active' | 'inactive' | 'terminated',
    username: '',
    password: '',
    role: 'employee' as 'employee' | 'manager'
  });

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      name: '',
      email: '',
      phone: '',
      position: '',
      department: '',
      salary: '',
      joinDate: format(new Date(), 'yyyy-MM-dd'),
      status: 'active',
      username: '',
      password: '',
      role: 'employee'
    });
    setEditingEmployee(null);
  };

  const generateEmployeeId = () => {
    const prefix = 'EMP';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 3).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  };

  const generateUsername = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check employee limit
    if (!editingEmployee && employees.length >= MAX_EMPLOYEES) {
      showMessage(`Maximum number of employees (${MAX_EMPLOYEES}) reached`, 'error');
      return;
    }

    // Validate required fields
    if (!formData.name.trim() || !formData.position.trim() || !formData.department.trim()) {
      showMessage('Please fill in all required fields', 'error');
      return;
    }

    // Validate salary
    const salaryAmount = parseInt(formData.salary.replace(/,/g, ''), 10);
    if (isNaN(salaryAmount) || salaryAmount <= 0) {
      showMessage('Please enter a valid salary amount', 'error');
      return;
    }

    try {
      if (editingEmployee) {
        // Update existing employee
        const updatedEmployee = {
          ...editingEmployee,
          ...formData,
          salary: salaryAmount,
          joinDate: new Date(formData.joinDate),
          updatedAt: new Date()
        };
        
        await updateEmployee(updatedEmployee);
        showMessage('Employee updated successfully!', 'success');
      } else {
        // Create new employee
        const employeeId = formData.employeeId || generateEmployeeId();
        const username = formData.username || generateUsername(formData.name);
        
        // Check for duplicate employee ID
        const existingEmpId = await db.getEmployeeByEmployeeId(employeeId);
        if (existingEmpId) {
          showMessage('Employee ID already exists', 'error');
          return;
        }

        // Check for duplicate username
        const existingUser = await db.getUserByUsername(username);
        if (existingUser) {
          showMessage('Username already exists', 'error');
          return;
        }

        const newEmployee = {
          employeeId,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          position: formData.position,
          department: formData.department,
          salary: salaryAmount,
          joinDate: new Date(formData.joinDate),
          status: formData.status,
          username,
          password: formData.password || 'employee123',
          role: formData.role
        };

        const savedEmployee = await createEmployee(newEmployee);

        // Create user account for employee
        try {
          await db.createUser({
            username,
            password: newEmployee.password,
            role: 'employee',
            createdAt: new Date(),
          });

          // Log the account creation
          await db.createActivity({
            userId: user!.id,
            action: 'create_employee_account',
            details: `Created employee account for ${formData.name} (${employeeId}) with username: ${username}`,
            timestamp: new Date(),
          });

          showMessage(`Employee and user account created successfully! Username: ${username}`, 'success');
        } catch (userError) {
          console.error('Failed to create user account:', userError);
          showMessage('Employee created but failed to create user account', 'error');
        }
      }

      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error('Error saving employee:', error);
      showMessage('Error saving employee. Please try again.', 'error');
    }
  };

  const handleEdit = (employee: any) => {
    setFormData({
      employeeId: employee.employeeId,
      name: employee.name,
      email: employee.email || '',
      phone: employee.phone || '',
      position: employee.position,
      department: employee.department,
      salary: employee.salary.toString(),
      joinDate: format(employee.joinDate, 'yyyy-MM-dd'),
      status: employee.status,
      username: employee.username,
      password: '', // Don't show existing password
      role: employee.role
    });
    setEditingEmployee(employee);
    setShowForm(true);
  };

  const handleDelete = async (employeeId: string, name: string) => {
    if (confirm(`Are you sure you want to delete employee "${name}"? This will also delete their user account.`)) {
      try {
        const employee = employees.find(e => e.id === employeeId);
        if (employee) {
          // Delete user account first
          try {
            const userAccount = await db.getUserByUsername(employee.username);
            if (userAccount) {
              await db.deleteUser(userAccount.id);
            }
          } catch (userError) {
            console.warn('Failed to delete user account:', userError);
          }

          // Delete employee
          await deleteEmployee(employeeId);
          
          // Log activity
          await db.createActivity({
            userId: user!.id,
            action: 'delete_employee',
            details: `Deleted employee ${name} (${employee.employeeId}) and associated user account`,
            timestamp: new Date(),
          });

          showMessage('Employee and user account deleted successfully!', 'success');
        }
      } catch (error) {
        console.error('Error deleting employee:', error);
        showMessage('Error deleting employee', 'error');
      }
    }
  };

  const handleViewDetails = async (employee: any) => {
    try {
      const attendance = await getEmployeeAttendance(employee.id);
      setEmployeeAttendance(attendance);
      setSelectedEmployee(employee);
      setShowDetails(true);
    } catch (error) {
      console.error('Error fetching employee attendance:', error);
      showMessage('Error loading employee details', 'error');
    }
  };

  const handleMarkAttendance = async (employeeId: string, status: 'present' | 'absent' | 'late' | 'half-day' | 'leave') => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Check if attendance already marked for today
      const existingAttendance = attendance.find(a => 
        a.employeeId === employeeId && 
        format(a.date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
      );

      if (existingAttendance) {
        showMessage('Attendance already marked for today', 'error');
        return;
      }

      await markAttendance({
        employeeId,
        date: today,
        status,
        checkIn: status === 'present' ? new Date() : undefined,
        notes: `Marked by ${user?.username}`,
        workingHours: status === 'present' ? 8 : status === 'half-day' ? 4 : 0
      });

      showMessage(`Attendance marked as ${status}`, 'success');
    } catch (error) {
      console.error('Error marking attendance:', error);
      showMessage('Error marking attendance', 'error');
    }
  };

  // Filter employees
  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = !searchTerm ||
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.department.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !filterStatus || employee.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const activeEmployees = employees.filter(e => e.status === 'active').length;
  const totalSalary = employees.reduce((sum, e) => sum + (e.salary || 0), 0);
  const avgSalary = employees.length > 0 ? totalSalary / employees.length : 0;

  // Today's attendance
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayAttendance = attendance.filter(a => 
    format(a.date, 'yyyy-MM-dd') === today
  );
  const presentToday = todayAttendance.filter(a => a.status === 'present').length;

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
            Employee Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Total Employees: {employees.length}/{MAX_EMPLOYEES} • Active: {activeEmployees} • Present Today: {presentToday}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          disabled={employees.length >= MAX_EMPLOYEES}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={20} />
          Add Employee
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover-lift">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{employees.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover-lift">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Present Today</p>
              <p className="text-2xl font-bold text-green-600">{presentToday}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover-lift">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Salary</p>
              <p className="text-2xl font-bold text-purple-600">₨{totalSalary.toLocaleString()}</p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover-lift">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Salary</p>
              <p className="text-2xl font-bold text-orange-600">₨{Math.round(avgSalary).toLocaleString()}</p>
            </div>
            <Calendar className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, ID, position, or department..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="terminated">Terminated</option>
          </select>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredEmployees.length} of {employees.length} employees
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-500">
              Limit: {employees.length}/{MAX_EMPLOYEES}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Attendance */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Quick Attendance - {format(new Date(), 'MMMM dd, yyyy')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.filter(e => e.status === 'active').map(employee => {
            const hasAttendance = todayAttendance.some(a => a.employeeId === employee.id);
            const attendanceRecord = todayAttendance.find(a => a.employeeId === employee.id);
            
            return (
              <div key={employee.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{employee.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{employee.position}</p>
                </div>
                <div className="flex items-center gap-2">
                  {hasAttendance ? (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      attendanceRecord?.status === 'present' ? 'bg-green-100 text-green-800' :
                      attendanceRecord?.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                      attendanceRecord?.status === 'absent' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {attendanceRecord?.status}
                    </span>
                  ) : (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleMarkAttendance(employee.id, 'present')}
                        className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                        title="Mark Present"
                      >
                        P
                      </button>
                      <button
                        onClick={() => handleMarkAttendance(employee.id, 'absent')}
                        className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                        title="Mark Absent"
                      >
                        A
                      </button>
                      <button
                        onClick={() => handleMarkAttendance(employee.id, 'late')}
                        className="px-2 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
                        title="Mark Late"
                      >
                        L
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Salary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {employee.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          ID: {employee.employeeId}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {employee.position}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {employee.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 dark:text-green-400">
                    ₨{employee.salary.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      employee.status === 'active' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                      employee.status === 'inactive' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                      'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                    }`}>
                      {employee.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewDetails(employee)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 transition-colors duration-200"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleEdit(employee)}
                        className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 transition-colors duration-200"
                        title="Edit Employee"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(employee.id, employee.name)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors duration-200"
                        title="Delete Employee"
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

        {filteredEmployees.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No employees found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {employees.length === 0
                ? "Add your first employee to get started"
                : "Try adjusting your search criteria"
              }
            </p>
            <button
              onClick={() => setShowForm(true)}
              disabled={employees.length >= MAX_EMPLOYEES}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 disabled:opacity-50"
            >
              <Plus size={20} />
              Add Employee
            </button>
          </div>
        )}
      </div>

      {/* Employee Form Modal */}
      {showForm && (
        <div className="form-modal">
          <div className="form-container animate-slideInRight">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
            </h2>

            <div className="max-h-[70vh] overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Employee ID
                    </label>
                    <input
                      type="text"
                      value={formData.employeeId}
                      onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                      placeholder="Auto-generated if empty"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter full name"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Enter email address"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Enter phone number"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Position *
                    </label>
                    <input
                      type="text"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      placeholder="e.g. Tax Consultant"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Department *
                    </label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    >
                      <option value="">Select Department</option>
                      <option value="Tax Services">Tax Services</option>
                      <option value="Accounting">Accounting</option>
                      <option value="Administration">Administration</option>
                      <option value="IT Support">IT Support</option>
                      <option value="Customer Service">Customer Service</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Monthly Salary *
                    </label>
                    <input
                      type="text"
                      value={formData.salary}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d]/g, '');
                        setFormData({ ...formData, salary: value ? parseInt(value).toLocaleString() : '' });
                      }}
                      placeholder="Enter monthly salary"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Join Date *
                    </label>
                    <input
                      type="date"
                      value={formData.joinDate}
                      onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="terminated">Terminated</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Role
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Login Account Details
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Username
                      </label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder="Auto-generated from name"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder={editingEmployee ? "Leave blank to keep current" : "Default: employee123"}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    A login account will be created automatically for this employee
                  </p>
                </div>
              </form>
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300"
              >
                {editingEmployee ? 'Update Employee' : 'Create Employee'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Details Modal */}
      {showDetails && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-slideInRight">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Eye className="w-6 h-6" />
                  Employee Details
                </h2>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Employee Information */}
                <div className="lg:col-span-1">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                    <div className="text-center mb-6">
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedEmployee.name}</h3>
                      <p className="text-gray-600 dark:text-gray-400">{selectedEmployee.position}</p>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400">Employee ID</label>
                        <p className="font-medium text-gray-900 dark:text-white">{selectedEmployee.employeeId}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400">Department</label>
                        <p className="font-medium text-gray-900 dark:text-white">{selectedEmployee.department}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400">Salary</label>
                        <p className="font-medium text-green-600 dark:text-green-400">₨{selectedEmployee.salary.toLocaleString()}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400">Join Date</label>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {format(selectedEmployee.joinDate, 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400">Status</label>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedEmployee.status === 'active' ? 'bg-green-100 text-green-800' :
                          selectedEmployee.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {selectedEmployee.status}
                        </span>
                      </div>
                      {selectedEmployee.email && (
                        <div>
                          <label className="text-sm text-gray-500 dark:text-gray-400">Email</label>
                          <p className="font-medium text-gray-900 dark:text-white">{selectedEmployee.email}</p>
                        </div>
                      )}
                      {selectedEmployee.phone && (
                        <div>
                          <label className="text-sm text-gray-500 dark:text-gray-400">Phone</label>
                          <p className="font-medium text-gray-900 dark:text-white">{selectedEmployee.phone}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Attendance History */}
                <div className="lg:col-span-2">
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Attendance History
                      </h3>
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto">
                      {employeeAttendance.length > 0 ? (
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Date
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Status
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Check In
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Hours
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {employeeAttendance.slice(0, 10).map((record) => (
                              <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                  {format(record.date, 'MMM dd, yyyy')}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    record.status === 'present' ? 'bg-green-100 text-green-800' :
                                    record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                    record.status === 'absent' ? 'bg-red-100 text-red-800' :
                                    record.status === 'half-day' ? 'bg-blue-100 text-blue-800' :
                                    'bg-purple-100 text-purple-800'
                                  }`}>
                                    {record.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                  {record.checkIn ? format(record.checkIn, 'HH:mm') : '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                  {record.workingHours || 0}h
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="text-center py-8">
                          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-500 dark:text-gray-400">No attendance records found</p>
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