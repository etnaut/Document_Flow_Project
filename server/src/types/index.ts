export interface User {
  User_Id: number;
  ID_Number: string;
  Full_Name: string;
  Gender: string;
  Email: string;
  Department: string;
  Division: string;
  User_Role: 'SuperAdmin' | 'Admin' | 'Employee' | 'DepartmentHead' | 'DivisionHead' | 'OfficerInCharge';
  User_Name: string;
  Status: boolean;
  pre_assigned_role?: string;
}

export interface Document {
  Document_Id: number;
  Type: string;
  User_Id: number;
  Status: 'Pending' | 'Approved' | 'Revision' | 'Released' | 'Archived' | 'Received';
  Priority: string;
  Document: Buffer | null;
  sender_name: string;
  sender_department: string;
  sender_division: string;
  target_department: string | null;
  comments: string | null;
  forwarded_from: string | null;
  forwarded_by_admin: string | null;
  is_forwarded_request: boolean | null;
  created_at: string | null;
  description: string | null;
}

export interface CreateUserInput {
  ID_Number: string;
  Full_Name: string;
  Gender: string;
  Email: string;
  Department: string;
  Division: string;
  User_Role: 'SuperAdmin' | 'Admin' | 'Employee' | 'DepartmentHead' | 'DivisionHead' | 'OfficerInCharge';
  User_Name: string;
  Password: string;
  Status: boolean;
}

export interface CreateDocumentInput {
  Type: string;
  User_Id: number;
  Priority: string;
  Document?: string; // base64 encoded
  description?: string;
}

export interface UpdateDocumentInput {
  Document_Id: number;
  Status?: 'Pending' | 'Approved' | 'Revision' | 'Released' | 'Archived' | 'Received';
  Priority?: string;
  Type?: string;
  Document?: string; // base64 encoded
  comments?: string;
  description?: string;
  admin?: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface ForwardDocumentInput {
  documentId: number;
  targetDepartment?: string;
  notes?: string;
  forwarderDepartment?: string;
  forwarderName?: string;
}

export interface DashboardStats {
  total: number;
  pending: number;
  approved: number;
  revision: number;
  released: number;
  received?: number;
}

