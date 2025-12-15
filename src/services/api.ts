import { User, Document, UserRole, DocumentResponse } from '@/types';

// Base URL for your XAMPP backend API
// Change this to match your XAMPP htdocs folder structure
// Example: if your PHP files are in htdocs/docuflow/api/
const API_BASE_URL = 'http://localhost/docuflow/api';

// API helper for making requests
const apiRequest = async (endpoint: string, options?: RequestInit) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });
    return response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Mock data for development - replace with actual API calls
const mockUsers: User[] = [
  {
    User_Id: 0,
    ID_Number: 1000,
    Full_Name: 'Super Admin',
    Gender: 'Male',
    Email: 'superadmin@company.com',
    Department: 'System',
    Division: 'System',
    User_Role: 'SuperAdmin',
    User_Name: 'superadmin',
    Status: true,
  },
  {
    User_Id: 1,
    ID_Number: 1001,
    Full_Name: 'Admin User',
    Gender: 'Male',
    Email: 'admin@company.com',
    Department: 'Information Technology',
    Division: 'ITSD',
    User_Role: 'Admin',
    User_Name: 'admin',
    Status: true,
  },
  {
    User_Id: 2,
    ID_Number: 1002,
    Full_Name: 'John Employee',
    Gender: 'Male',
    Email: 'john@company.com',
    Department: 'Human Resources',
    Division: 'CEO',
    User_Role: 'Employee',
    User_Name: 'employee',
    Status: true,
  },
  {
    User_Id: 3,
    ID_Number: 1003,
    Full_Name: 'HR Admin',
    Gender: 'Female',
    Email: 'hradmin@company.com',
    Department: 'Human Resources',
    Division: 'CEO',
    User_Role: 'Admin',
    User_Name: 'hradmin',
    Status: true,
  },
];

const mockDocuments: Document[] = [
  {
    Document_Id: 1,
    Type: 'Leave Request',
    User_Id: 2,
    Status: 'Pending',
    Priority: 'High',
    sender_name: 'John Employee',
    sender_department: 'Human Resources',
    target_department: 'Information Technology',
    created_at: '2024-12-10',
  },
  {
    Document_Id: 2,
    Type: 'Budget Proposal',
    User_Id: 2,
    Status: 'Approved',
    Priority: 'Medium',
    sender_name: 'John Employee',
    sender_department: 'Human Resources',
    target_department: 'Finance',
    created_at: '2024-12-09',
  },
  {
    Document_Id: 3,
    Type: 'Travel Authorization',
    User_Id: 2,
    Status: 'Revision',
    Priority: 'Low',
    sender_name: 'John Employee',
    sender_department: 'Human Resources',
    target_department: 'Information Technology',
    created_at: '2024-12-08',
  },
  {
    Document_Id: 4,
    Type: 'Equipment Request',
    User_Id: 2,
    Status: 'Released',
    Priority: 'High',
    sender_name: 'John Employee',
    sender_department: 'Human Resources',
    target_department: 'Information Technology',
    created_at: '2024-12-07',
  },
  {
    Document_Id: 5,
    Type: 'Policy Update',
    User_Id: 2,
    Status: 'Pending',
    Priority: 'Medium',
    sender_name: 'John Employee',
    sender_department: 'Human Resources',
    target_department: 'Human Resources',
    created_at: '2024-12-06',
  },
];

// Authentication
export const loginUser = async (username: string, password: string): Promise<User | null> => {
  // TODO: Replace with actual API call
  // const response = await fetch(`${API_BASE_URL}/login`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ username, password }),
  // });
  // return response.json();

  // Mock login - use 'admin/admin', 'employee/employee', or 'hradmin/hradmin'
  const user = mockUsers.find(
    (u) => u.User_Name === username && password === username
  );
  return user || null;
};

// Get all documents - filtered by user's department for Admin
export const getDocuments = async (userId?: number, role?: UserRole, userDepartment?: string): Promise<Document[]> => {
  // TODO: Replace with actual API call
  // const response = await fetch(`${API_BASE_URL}/documents?userId=${userId}&role=${role}&department=${userDepartment}`);
  // return response.json();

  if (role === 'Admin') {
    // Admin sees only documents sent TO their department
    return mockDocuments.filter((d) => d.target_department === userDepartment);
  }
  // Employee sees only their own documents
  return mockDocuments.filter((d) => d.User_Id === userId);
};

// Get documents by status - filtered by department for Admin
export const getDocumentsByStatus = async (status: string, userDepartment?: string, role?: UserRole): Promise<Document[]> => {
  if (role === 'Admin') {
    return mockDocuments.filter((d) => d.Status === status && d.target_department === userDepartment);
  }
  return mockDocuments.filter((d) => d.Status === status);
};

// Create new document
export const createDocument = async (document: Partial<Document>): Promise<Document> => {
  // TODO: Replace with actual API call
  const newDoc: Document = {
    Document_Id: mockDocuments.length + 1,
    Type: document.Type || '',
    User_Id: document.User_Id || 0,
    Status: 'Pending',
    Priority: document.Priority || 'Medium',
    sender_name: document.sender_name,
    sender_department: document.sender_department,
    target_department: document.target_department || '',
    created_at: new Date().toISOString().split('T')[0],
  };
  mockDocuments.push(newDoc);
  return newDoc;
};

// Update document status
export const updateDocumentStatus = async (
  documentId: number,
  status: Document['Status'],
  comments?: string
): Promise<Document | null> => {
  // TODO: Replace with actual API call
  const doc = mockDocuments.find((d) => d.Document_Id === documentId);
  if (doc) {
    doc.Status = status;
    if (comments) {
      doc.comments = comments;
    }
    return doc;
  }
  return null;
};

// Update document (for revision)
export const updateDocument = async (
  documentId: number,
  updates: Partial<Document>
): Promise<Document | null> => {
  // TODO: Replace with actual API call
  // return apiRequest(`/documents/${documentId}`, {
  //   method: 'PUT',
  //   body: JSON.stringify(updates),
  // });

  const index = mockDocuments.findIndex((d) => d.Document_Id === documentId);
  if (index !== -1) {
    mockDocuments[index] = { ...mockDocuments[index], ...updates, Status: 'Pending' };
    return mockDocuments[index];
  }
  return null;
};

// Forward document to another department (Admin to Admin)
export const forwardDocument = async (
  documentId: number,
  targetDepartment: string,
  notes?: string,
  forwarderDepartment?: string,
  forwarderName?: string
): Promise<Document | null> => {
  const doc = mockDocuments.find((d) => d.Document_Id === documentId);
  if (doc) {
    doc.forwarded_from = forwarderDepartment || doc.target_department;
    doc.forwarded_by_admin = forwarderName;
    doc.target_department = targetDepartment;
    doc.Status = 'Received';
    doc.is_forwarded_request = true;
    if (notes) {
      doc.comments = notes;
    }
    return doc;
  }
  return null;
};

// Get received requests (documents forwarded from other admins)
export const getReceivedRequests = async (userDepartment: string): Promise<Document[]> => {
  return mockDocuments.filter(
    (d) => d.target_department === userDepartment && d.is_forwarded_request === true && d.Status !== 'Archived'
  );
};

// Archive document (mark as done)
export const archiveDocument = async (documentId: number): Promise<Document | null> => {
  const doc = mockDocuments.find((d) => d.Document_Id === documentId);
  if (doc) {
    doc.Status = 'Archived';
    return doc;
  }
  return null;
};

// Mock responses storage
const mockResponses: DocumentResponse[] = [];

// Respond to document and send back to sender
export const respondToDocument = async (
  documentId: number,
  responderDepartment: string,
  responderName: string,
  message: string
): Promise<DocumentResponse> => {
  const newResponse: DocumentResponse = {
    Response_Id: mockResponses.length + 1,
    Document_Id: documentId,
    Responder_Department: responderDepartment,
    Responder_Name: responderName,
    Response_Message: message,
    Response_Date: new Date().toISOString().split('T')[0],
  };
  mockResponses.push(newResponse);
  
  // Update the document status
  const doc = mockDocuments.find((d) => d.Document_Id === documentId);
  if (doc) {
    doc.Status = 'Archived';
  }
  
  return newResponse;
};

// Get responses for documents sent from this department
export const getDocumentResponses = async (userDepartment: string): Promise<DocumentResponse[]> => {
  const forwardedDocIds = mockDocuments
    .filter((d) => d.forwarded_from === userDepartment)
    .map((d) => d.Document_Id);
  
  return mockResponses.filter((r) => forwardedDocIds.includes(r.Document_Id));
};

// Get divisions (mock)
export const getDivisions = async (): Promise<string[]> => {
  return ['ITSD', 'CEO', 'CMO', 'AO', 'DEPT', 'DV', 'OC'];
};

// Get departments (mock)
export const getDepartments = async (): Promise<string[]> => {
  return [
    'Information Technology',
    'Human Resources',
    'Finance',
    'Operations',
    'Marketing',
    'Administration',
  ];
};

// Get dashboard stats - filtered by department for Admin
export const getDashboardStats = async (userId?: number, role?: UserRole, userDepartment?: string) => {
  let docs: Document[];
  
  if (role === 'Admin') {
    docs = mockDocuments.filter((d) => d.target_department === userDepartment);
  } else {
    docs = mockDocuments.filter((d) => d.User_Id === userId);
  }
  
  const receivedCount = mockDocuments.filter(
    (d) => d.target_department === userDepartment && d.is_forwarded_request === true && d.Status !== 'Archived'
  ).length;
  
  return {
    total: docs.length,
    pending: docs.filter((d) => d.Status === 'Pending').length,
    approved: docs.filter((d) => d.Status === 'Approved').length,
    revision: docs.filter((d) => d.Status === 'Revision').length,
    released: docs.filter((d) => d.Status === 'Released').length,
    received: receivedCount,
  };
};

// Get users by role
export const getUsers = async (role?: UserRole): Promise<User[]> => {
  if (role) {
    return mockUsers.filter((u) => u.User_Role === role);
  }
  return mockUsers;
};

// Get employees by department
export const getEmployeesByDepartment = async (department: string): Promise<User[]> => {
  return mockUsers.filter((u) => u.User_Role === 'Employee' && u.Department === department);
};

// Create user
interface CreateUserData {
  ID_Number: number;
  Full_Name: string;
  Gender: string;
  Email: string;
  Department: string;
  Division: string;
  User_Role: UserRole;
  User_Name: string;
  Password: string;
  Status: boolean;
}

export const createUser = async (userData: CreateUserData): Promise<User> => {
  const newUser: User = {
    User_Id: mockUsers.length + 1,
    ID_Number: userData.ID_Number,
    Full_Name: userData.Full_Name,
    Gender: userData.Gender,
    Email: userData.Email,
    Department: userData.Department,
    Division: userData.Division,
    User_Role: userData.User_Role,
    User_Name: userData.User_Name,
    Status: userData.Status,
  };
  mockUsers.push(newUser);
  return newUser;
};
