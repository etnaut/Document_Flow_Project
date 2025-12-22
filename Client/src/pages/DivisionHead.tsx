import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { getUsers, getEmployeesByDepartment, updateUserStatus } from '@/services/api';
import { User } from '@/types';
import { toast } from '@/hooks/use-toast';
import { updateUserAssignment } from '@/services/api';

const DivisionHead: React.FC = () => {
	const { user } = useAuth();
	// Only DivisionHead allowed on this page
	if (!user) return <Navigate to="/login" replace />;

	const [employees, setEmployees] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [divisionEmployees, setDivisionEmployees] = useState<User[]>([]);

	useEffect(() => {
		if (!user) return;
		void loadEmployees();
	}, [user]);

	const loadEmployees = async () => {
		try {
			setLoading(true);
			// Fetch employees for the department, then filter by division
			const dept = user.Department || '';
			const div = user.Division || '';

			let list: User[] = [];
			try {
				const byDept = await getEmployeesByDepartment(dept) as any;
				// normalize shape if needed (getEmployeesByDepartment returns raw api shape)
				if (Array.isArray(byDept)) list = byDept as User[];
				else if (byDept && Array.isArray((byDept as any).data)) list = (byDept as any).data;
				else list = (byDept as any).users || [];
			} catch (e) {
				// fallback to getUsers('Employee') and filter
				const allEmployees = await getUsers('Employee');
				list = allEmployees.filter((u) => u.Department === dept);
			}

			// Ensure normalized User shape (getUsers does normalization, but above may not)
			// If items don't have User_Id, map via existing fields
			const normalized = list.map((u: any) => ({
				User_Id: u.User_Id ?? u.user_id ?? 0,
				ID_Number: u.ID_Number ?? u.id_number ?? 0,
				Full_Name: u.Full_Name ?? u.full_name ?? u.fullName ?? '',
				Gender: u.Gender ?? u.gender ?? '',
				Email: u.Email ?? u.email ?? '',
				Department: u.Department ?? u.department ?? '',
				Division: u.Division ?? u.division ?? '',
				pre_assigned_role: u.pre_assigned_role ?? u.preAssignedRole ?? u.preAssigned_Role ?? '',
				User_Role: (u.User_Role ?? u.user_role ?? 'Employee') as any,
				User_Name: u.User_Name ?? u.user_name ?? '',
				Status: typeof u.Status === 'boolean' ? u.Status : (String(u.Status || '').toLowerCase() === 'active'),
			} as User));

			// Filter by division
			const filtered = normalized.filter((e) => e.Division === div);
			setEmployees(filtered);
			// also provide the full list of employees in this division for assignee dropdowns
			setDivisionEmployees(filtered);
		} catch (err: any) {
			console.error('Load employees error', err);
			toast({ title: 'Error', description: err?.message || 'Failed to load employees', variant: 'destructive' });
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-foreground">Manage Employees</h1>
					<p className="text-muted-foreground">Employees in your division</p>
				</div>
				<div className="flex gap-2">
					<button className="btn" onClick={() => void loadEmployees()}>Refresh</button>
				</div>
			</div>

			<div className="overflow-auto bg-card p-4 rounded">
				<table className="w-full table-auto">
					<thead>
						<tr className="text-left text-sm text-muted-foreground">
							<th className="px-2 py-2">Name</th>
							<th className="px-2 py-2">Email</th>
							<th className="px-2 py-2">Department</th>
							<th className="px-2 py-2">Division</th>
							<th className="px-2 py-2">Status</th>
							<th className="px-2 py-2">Assigned</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr><td colSpan={5} className="p-4 text-sm text-muted-foreground">Loading...</td></tr>
						) : employees.length === 0 ? (
							<tr><td colSpan={5} className="p-4 text-sm text-muted-foreground">No employees found</td></tr>
						) : (
							employees.map((emp) => (
								<tr key={emp.User_Id} className="border-t">
									<td className="px-2 py-3">{emp.Full_Name}</td>
									<td className="px-2 py-3">{emp.Email}</td>
									<td className="px-2 py-3">{emp.Department}</td>
									<td className="px-2 py-3">{emp.Division}</td>
									<td className="px-2 py-3">
										<select
											value={emp.Status ? 'active' : 'inactive'}
											onChange={async (e) => {
												const val = e.target.value === 'active';
												try {
													await updateUserStatus(emp.User_Id, val);
													setEmployees((prev) => prev.map((p) => p.User_Id === emp.User_Id ? ({ ...p, Status: val }) : p));
													toast({ title: 'Saved', description: `User ${val ? 'activated' : 'deactivated'}` });
												} catch (err: any) {
													toast({ title: 'Error', description: err?.message || 'Failed to update status', variant: 'destructive' });
												}
											}}
										>
											<option value="active">Active</option>
											<option value="inactive">Inactive</option>
										</select>
									</td>
									<td className="px-2 py-3">
										<select
											value={(emp as any).pre_assigned_role || ''}
											onChange={async (e) => {
												const val = e.target.value;
												try {
													await updateUserAssignment(emp.User_Id, val);
													setEmployees((prev) => prev.map((p) => p.User_Id === emp.User_Id ? ({ ...p, ...( { pre_assigned_role: val } as any) }) : p));
													toast({ title: 'Saved', description: 'Assignment updated' });
												} catch (err: any) {
													toast({ title: 'Error', description: err?.message || 'Failed to update assignment', variant: 'destructive' });
												}
											}}
										>
											<option value="">None</option>
											<option value="Recorder">Recorder</option>
											<option value="Releaser">Releaser</option>
										</select>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default DivisionHead;
