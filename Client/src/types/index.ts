// Extend roles to include department/division heads and officer-in-charge
export type UserRole =
  | 'SuperAdmin'
  | 'Admin'
  | 'Employee'
  | 'DepartmentHead'
  | 'DivisionHead'
  | 'OfficerInCharge'
  | 'Releaser';

export interface User {
  User_Id: number;
  ID_Number: number;
  Full_Name: string;
  Gender: string;
  Email: string;
  Department: string;
  Division: string;
  User_Role: UserRole;
  User_Name: string;
  Status: boolean;
  pre_assigned_role?: string;
}

export interface Document {
  Document_Id: number;
  Type: string;
  User_Id: number;
  Status: 'Pending' | 'Approved' | 'Revision' | 'Released' | 'Received' | 'Archived';
  Priority: string;
  Document?: string | null; // base64-encoded file payload (optional)
  sender_name?: string;
  sender_department?: string;
  target_department: string; // The department this document is sent TO
  created_at?: string;
  comments?: string;
  description?: string;
  forwarded_from?: string; // Department that forwarded this document
  forwarded_by_admin?: string; // Name of admin who forwarded
  is_forwarded_request?: boolean; // True if this was forwarded from another admin
}

export interface DocumentResponse {
  Response_Id: number;
  Document_Id: number;
  Responder_Department: string;
  Responder_Name: string;
  Response_Message: string;
  Response_Date: string;
}

export interface ApprovedDocument {
  Approved_Doc_Id: number;
  Document_Id: number;
  User_Id: number;
}

export interface RevisionDocument {
  Revesion_Doc_Id: number;
  Document_Id: number;
  User_Id: number;
  comments?: string;
}

export interface RevisionEntry {
  document_id: number;
  user_id: number;
  comment: string | null;
  admin: string | null;
  document_type: string | null;
  sender_name: string | null;
}

export interface ResponseDocument {
  Respond_Doc_Id: number;
  Document_Id: number;
  User_Id: number;
  Status: string;
}

export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<User | null>;
  logout: () => void;
  isAuthenticated: boolean;
  // Accept either a User object (preferred) or a role string
  getDefaultRoute: (userOrRole: User | string) => string;
}
