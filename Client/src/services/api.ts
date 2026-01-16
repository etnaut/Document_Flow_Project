import { User, Document, UserRole, DocumentResponse, RevisionEntry } from '@/types';

// Normalize different backend casing (snake_case / lower-case) to the client `User` shape
export const normalizeUser = (u: any): User => {
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
    // optional pre-assigned role (e.g., Recorder / Releaser)
    pre_assigned_role: String(u.pre_assigned_role ?? u.preAssignedRole ?? u.preAssigned_Role ?? '').trim() as any,
  };
};

// Base URL for the TypeScript backend API
export const API_BASE_URL = 'http://localhost:3001/api';

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
  const data = await apiRequest('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

  if (!data) return null;
  // The login endpoint returns a user-like object; normalize to client User shape
  return normalizeUser(data as any);
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
export const getDocumentsByStatus = async (status: string, userDepartment?: string, role?: UserRole, userId?: number): Promise<Document[]> => {
  const params = new URLSearchParams({ status });
  if (role) params.append('role', role);
  if (userDepartment) params.append('department', userDepartment);
  if (userId !== undefined) params.append('userId', String(userId));

  return apiRequest(`/documents?${params.toString()}`, { method: 'GET' });
};

// Get approved documents (for heads) sourced from approved_document_tbl
export const getApprovedDocuments = async (department?: string, status?: string, userId?: number): Promise<Document[]> => {
  const params = new URLSearchParams();
  if (department) params.append('department', department);
  if (status) params.append('status', status);
  if (userId !== undefined) params.append('userId', String(userId));
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/documents/approved${query}`, { method: 'GET' });
};

export const getRecordedDocuments = async (department?: string, status?: string): Promise<Document[]> => {
  const params = new URLSearchParams();
  if (department) params.append('department', department);
  if (status) params.append('status', status);
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/documents/records${query}`, { method: 'GET' });
};

export const releaseRecordedDocument = async (recordDocId: number): Promise<any> => {
  return apiRequest(`/documents/records/${recordDocId}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'released' }),
  });
};

export const createReleaseDocument = async (
  recordDocId: number,
  status: 'low' | 'medium' | 'high',
  department: string,
  division: string
): Promise<any> => {
  // documents router is mounted under /api/documents
  return apiRequest('/documents/releases', {
    method: 'POST',
    body: JSON.stringify({ record_doc_id: recordDocId, status, department, division }),
  });
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
  comments?: string,
  admin?: string,
  recordStatus?: 'recorded' | 'not_recorded'
): Promise<Document | null> => {
  const body: any = { Document_Id: documentId, Status: status };
  if (comments !== undefined) body.comments = comments;
  if (admin !== undefined) body.admin = admin;
  if (recordStatus !== undefined) body.record_status = recordStatus;
  return apiRequest('/documents', {
    method: 'PUT',
    body: JSON.stringify(body),
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

// Delete a document
export const deleteDocument = async (documentId: number): Promise<{ success: boolean }> => {
  return apiRequest(`/documents/${documentId}`, { method: 'DELETE' });
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

// Get received requests (releases) filtered by department/division
export const getReceivedRequests = async (userDepartment: string, userDivision?: string, userId?: number): Promise<any[]> => {
  const params = new URLSearchParams();
  if (userDepartment) params.append('department', userDepartment);
  if (userDivision) params.append('division', userDivision);
  if (userId !== undefined) params.append('userId', String(userId));
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/documents/releases${query}`, { method: 'GET' });
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

// Create respond document entry in respond_document_tbl
export const createRespondDocument = async (
  releaseDocId: number,
  userId: number,
  status: 'actioned' | 'not actioned',
  comment: string
): Promise<any> => {
  return apiRequest('/documents/respond', {
    method: 'POST',
    body: JSON.stringify({
      release_doc_id: releaseDocId,
      user_id: userId,
      status: status,
      comment: comment,
    }),
  });
};

// Get revision entries
export const getRevisions = async (): Promise<RevisionEntry[]> => {
  return apiRequest('/documents/revisions', { method: 'GET' });
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

// Create a new department
export const createDepartment = async (name: string) => {
  return apiRequest('/departments', {
    method: 'POST',
    body: JSON.stringify({ Department: name }),
  });
};

// Create a new division under a department (department can be name or id)
export const createDivision = async (division: string, department: string | number) => {
  return apiRequest('/divisions', {
    method: 'POST',
    body: JSON.stringify({ Division: division, Department: department }),
  });
};

// Get dashboard stats - filtered by department for Admin
export const getDashboardStats = async (userId?: number, role?: UserRole, userDepartment?: string) => {
  const params = new URLSearchParams();
  if (userId !== undefined) params.append('userId', String(userId));
  if (role) params.append('role', role);
  if (userDepartment) params.append('department', userDepartment);
  
  return apiRequest(`/stats?${params.toString()}`, { method: 'GET' });
};

// Get monthly totals for a given year
export const getMonthlyStats = async (year: number, userId?: number, role?: UserRole): Promise<{ month: string; total: number }[]> => {
  const params = new URLSearchParams();
  params.append('year', String(year));
  if (userId !== undefined) params.append('userId', String(userId));
  if (role) params.append('role', role);
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/stats/monthly${query}`, { method: 'GET' });
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

// Update user status (activate / deactivate)
export const updateUserStatus = async (userId: number, status: boolean): Promise<User | null> => {
  // Use a dedicated endpoint to avoid colliding with other user updates
  return apiRequest('/users/status', {
    method: 'PUT',
    body: JSON.stringify({ User_Id: userId, Status: status }),
  });
};

// Update user's pre-assigned role (e.g., Recorder / Releaser)
export const updateUserAssignment = async (userId: number, role: string): Promise<User | null> => {
  return apiRequest('/users/assign', {
    method: 'PUT',
    body: JSON.stringify({ User_Id: userId, pre_assigned_role: role }),
  });
};

// Mark a release record (e.g., set mark = 'done' or 'not_done')
export const markRelease = async (recordDocId: number, mark: string): Promise<any> => {
  return apiRequest(`/documents/releases/${recordDocId}/mark`, {
    method: 'PUT',
    body: JSON.stringify({ mark }),
  });
};

// Get release tracking entries for a document (defaults to mark='done' when server supports it)
export const getReleaseTrack = async (params: { documentId?: number; approvedDocId?: number; recordDocId?: number }): Promise<any[]> => {
  const query = new URLSearchParams();
  if (params.documentId) query.append('documentId', String(params.documentId));
  if (params.approvedDocId) query.append('approvedDocId', String(params.approvedDocId));
  if (params.recordDocId) query.append('recordDocId', String(params.recordDocId));
  const q = query.toString() ? `?${query.toString()}` : '';
  return apiRequest(`/documents/releases/track${q}`, { method: 'GET' });
};

export const getDocumentTrack = async (documentId?: number): Promise<any> => {
  if (!documentId) return [];
  const q = `?documentId=${documentId}`;
  return apiRequest(`/documents/track${q}`, { method: 'GET' });
};
