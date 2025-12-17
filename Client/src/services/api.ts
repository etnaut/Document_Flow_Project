import { User, Document, UserRole, DocumentResponse } from '@/types';

// Normalize different backend casing (snake_case / lower-case) to the client `User` shape
const normalizeUser = (u: any): User => {
  const statusRaw = u.Status ?? u.status ?? u.Status;
  const status = (() => {
    if (typeof statusRaw === 'boolean') return statusRaw;
    if (typeof statusRaw === 'string') return statusRaw.toLowerCase() === 'active' || statusRaw.toLowerCase() === 'true';
    return Boolean(statusRaw);
  })();

  return {
    User_Id: u.User_Id ?? u.user_id ?? 0,
    ID_Number: u.ID_Number ?? u.id_number ?? u.idNumber ?? u.id_number ?? 0,
    Full_Name: u.Full_Name ?? u.full_name ?? u.fullName ?? '',
    Gender: u.Gender ?? u.gender ?? '',
    Email: u.Email ?? u.email ?? '',
    Department: u.Department ?? u.department ?? '',
    Division: u.Division ?? u.division ?? '',
    User_Role: (u.User_Role ?? u.user_role ?? 'Employee') as UserRole,
    User_Name: u.User_Name ?? u.user_name ?? '',
    Status: status,
  };
};

// Base URL for the TypeScript backend API
const API_BASE_URL = 'http://localhost:3001/api';

// API helper for making requests with basic error handling
const apiRequest = async (endpoint: string, options?: RequestInit) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    // Handle network errors
    if (!response.ok && response.status === 0) {
      throw new Error('Cannot connect to backend server. Please make sure the server is running on http://localhost:3001');
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        (data && (data.error || data.message)) ||
        `Request failed with status ${response.status}`;
      throw new Error(message);
    }

    return data;
  } catch (error: any) {
    // Re-throw with more context if it's a network error
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Cannot connect to backend server. Please make sure the server is running on http://localhost:3001');
    }
    throw error;
  }
};

// Authentication
export const loginUser = async (username: string, password: string): Promise<User | null> => {
  return apiRequest('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
};

// Get all documents - filtered by user's department for Admin
export const getDocuments = async (userId?: number, role?: UserRole, userDepartment?: string): Promise<Document[]> => {
  const params = new URLSearchParams();
  if (userId !== undefined) params.append('userId', String(userId));
  if (role) params.append('role', role);
  if (userDepartment) params.append('department', userDepartment);

  return apiRequest(`/documents?${params.toString()}`, { method: 'GET' });
};

// Get documents by status - filtered by department for Admin
export const getDocumentsByStatus = async (status: string, userDepartment?: string, role?: UserRole): Promise<Document[]> => {
  const params = new URLSearchParams({ status });
  if (role) params.append('role', role);
  if (userDepartment) params.append('department', userDepartment);

  return apiRequest(`/documents?${params.toString()}`, { method: 'GET' });
};

// Create new document
export const createDocument = async (document: Partial<Document>): Promise<Document> => {
  return apiRequest('/documents', {
    method: 'POST',
    body: JSON.stringify(document),
  });
};

// Update document status
export const updateDocumentStatus = async (
  documentId: number,
  status: Document['Status'],
  comments?: string
): Promise<Document | null> => {
  return apiRequest('/documents', {
    method: 'PUT',
    body: JSON.stringify({
      Document_Id: documentId,
      Status: status,
      comments,
    }),
  });
};

// Update document (for revision)
export const updateDocument = async (
  documentId: number,
  updates: Partial<Document>
): Promise<Document | null> => {
  return apiRequest('/documents', {
    method: 'PUT',
    body: JSON.stringify({ Document_Id: documentId, ...updates }),
  });
};

// Forward document to another department (Admin to Admin)
export const forwardDocument = async (
  documentId: number,
  targetDepartment: string,
  notes?: string,
  forwarderDepartment?: string,
  forwarderName?: string
): Promise<Document | null> => {
  return apiRequest('/forward', {
    method: 'POST',
    body: JSON.stringify({
      documentId,
      targetDepartment,
      notes,
      forwarderDepartment,
      forwarderName,
    }),
  });
};

// Get received requests (documents forwarded from other admins)
export const getReceivedRequests = async (userDepartment: string): Promise<Document[]> => {
  const docs = await getDocuments(undefined, 'Admin', userDepartment);
  return docs.filter((d) => d.target_department === userDepartment && d.Status !== 'Archived');
};

// Archive document (mark as done)
export const archiveDocument = async (documentId: number): Promise<Document | null> => {
  return updateDocumentStatus(documentId, 'Archived');
};

// Respond to document and send back to sender
export const respondToDocument = async (
  documentId: number,
  responderDepartment: string,
  responderName: string,
  message: string
): Promise<DocumentResponse> => {
  // No dedicated endpoint yet; store response in the document comments and archive
  const updatedDoc = await updateDocument(documentId, {
    comments: message,
    Status: 'Archived',
  });

  if (!updatedDoc) {
    throw new Error('Unable to update document with response');
  }

  return {
    Response_Id: documentId,
    Document_Id: documentId,
    Responder_Department: responderDepartment,
    Responder_Name: responderName,
    Response_Message: message,
    Response_Date: new Date().toISOString().split('T')[0],
  };
};

// Get responses for documents sent from this department
export const getDocumentResponses = async (userDepartment: string): Promise<DocumentResponse[]> => {
  // Backend endpoint not available; derive from documents comments history
  const docs = await getDocuments(undefined, 'Admin', userDepartment);
  return docs
    .filter((d) => d.forwarded_from === userDepartment && d.comments)
    .map((d) => ({
      Response_Id: d.Document_Id,
      Document_Id: d.Document_Id,
      Responder_Department: d.forwarded_by_admin || '',
      Responder_Name: d.forwarded_by_admin || '',
      Response_Message: d.comments || '',
      Response_Date:
        (d as any).updated_at ||
        d.created_at ||
        new Date().toISOString().split('T')[0],
    }));
};

// Get divisions
export const getDivisions = async (department?: string): Promise<string[]> => {
  const params = new URLSearchParams();
  if (department) params.append('department', department);
  const query = params.toString() ? `?${params.toString()}` : '';
  const data = await apiRequest(`/divisions${query}`, { method: 'GET' }) as any;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
};

// Get departments
export const getDepartments = async (): Promise<string[]> => {
  const data = await apiRequest('/departments', { method: 'GET' }) as any;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
};

// Get dashboard stats - filtered by department for Admin
export const getDashboardStats = async (userId?: number, role?: UserRole, userDepartment?: string) => {
  const params = new URLSearchParams();
  if (userId !== undefined) params.append('userId', String(userId));
  if (role) params.append('role', role);
  if (userDepartment) params.append('department', userDepartment);
  
  return apiRequest(`/stats?${params.toString()}`, { method: 'GET' });
};

// Get users by role
export const getUsers = async (role?: UserRole): Promise<User[]> => {
  const params = new URLSearchParams();
  if (role) params.append('role', role);
  const data = await apiRequest(`/users?${params.toString()}`, { method: 'GET' }) as any;
  // Normalize response shapes: accept either an array or an object with a `data` or `users` array
  let arr: any[] = [];
  if (Array.isArray(data)) arr = data;
  else if (data && Array.isArray(data.data)) arr = data.data;
  else if (data && Array.isArray(data.users)) arr = data.users;
  else return [];

  return arr.map(normalizeUser);
};

// Get employees by department
export const getEmployeesByDepartment = async (department: string): Promise<User[]> => {
  const params = new URLSearchParams({ department, role: 'Employee' });
  return apiRequest(`/users?${params.toString()}`, { method: 'GET' });
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
  return apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};
