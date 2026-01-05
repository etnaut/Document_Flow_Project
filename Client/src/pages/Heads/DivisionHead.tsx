import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { getUsers, getEmployeesByDepartment, normalizeUser, updateUserAssignment, updateUserStatus } from '@/services/api';
import { User } from '@/types';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const DivisionHead: React.FC = () => {
	const { user } = useAuth();

	const [employees, setEmployees] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [divisionEmployees, setDivisionEmployees] = useState<User[]>([]);

	const coerceArray = (value: unknown): unknown[] | null => {
		if (Array.isArray(value)) return value;
		if (value && typeof value === 'object') {
			const dataProp = (value as { data?: unknown[] }).data;
			const usersProp = (value as { users?: unknown[] }).users;
			if (Array.isArray(dataProp)) return dataProp;
			if (Array.isArray(usersProp)) return usersProp;
		}
		return null;
	};

	const loadEmployees = useCallback(async () => {
		if (!user) return;
		try {
			setLoading(true);
			const dept = user.Department || '';
			const div = user.Division || '';

			let list: User[] = [];
			try {
				const raw = (await getEmployeesByDepartment(dept)) as unknown;
				const coerced = coerceArray(raw);
				if (coerced) list = coerced.map((item) => normalizeUser(item));
			} catch (error) {
				console.warn('getEmployeesByDepartment failed, falling back to getUsers', error);
			}

			if (list.length === 0) {
				const allEmployees = await getUsers('Employee');
				list = allEmployees.filter((u) => u.Department === dept);
			}

			const filtered = list.filter((e) => e.Division === div);
			setEmployees(filtered);
			setDivisionEmployees(filtered);
		} catch (error) {
			console.error('Load employees error', error);
			const message = error instanceof Error ? error.message : 'Failed to load employees';
			toast({ title: 'Error', description: message, variant: 'destructive' });
		} finally {
			setLoading(false);
		}
	}, [user]);

	useEffect(() => {
		if (!user) return;
		void loadEmployees();
	}, [user, loadEmployees]);

	return (
		<div className="space-y-6">
			{!user ? <Navigate to="/login" replace /> : null}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-foreground">Manage Employees</h1>
					<p className="text-muted-foreground">Employees in your division</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" onClick={() => void loadEmployees()} disabled={loading}>
						{loading ? 'Loading…' : 'Refresh'}
					</Button>
				</div>
			</div>

			<div className="overflow-auto bg-card p-4 rounded">
				<table className="w-full table-auto text-sm">
					<thead>
						<tr className="text-left text-muted-foreground">
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
							<tr><td colSpan={6} className="p-4 text-muted-foreground">Loading...</td></tr>
						) : employees.length === 0 ? (
							<tr><td colSpan={6} className="p-4 text-muted-foreground">No employees found</td></tr>
						) : (
							employees.map((emp) => (
								<tr key={emp.User_Id} className="border-t">
									<td className="px-2 py-3 font-medium">{emp.Full_Name}</td>
									<td className="px-2 py-3">{emp.Email}</td>
									<td className="px-2 py-3">{emp.Department}</td>
									<td className="px-2 py-3">{emp.Division}</td>
									<td className="px-2 py-3 space-y-1">
										<Badge variant={emp.Status ? 'default' : 'secondary'} className={emp.Status ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : ''}>
											{emp.Status ? 'Active' : 'Inactive'}
										</Badge>
										<Select
											value={emp.Status ? 'active' : 'inactive'}
											onValueChange={async (v) => {
												const next = v === 'active';
												const prev = emp.Status;
												setEmployees((p) => p.map((e) => e.User_Id === emp.User_Id ? { ...e, Status: next } : e));
												try {
													await updateUserStatus(emp.User_Id, next);
													toast({ title: 'Saved', description: `Marked as ${next ? 'Active' : 'Inactive'}` });
												} catch (error) {
													setEmployees((p) => p.map((e) => e.User_Id === emp.User_Id ? { ...e, Status: prev } : e));
													const message = error instanceof Error ? error.message : 'Failed to update status';
													toast({ title: 'Error', description: message, variant: 'destructive' });
												}
											}}
										>
											<SelectTrigger className="w-[140px]">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="active">Active</SelectItem>
												<SelectItem value="inactive">Inactive</SelectItem>
											</SelectContent>
										</Select>
									</td>
									<td className="px-2 py-3">
										<select
											value={emp.pre_assigned_role || ''}
											onChange={async (e) => {
												const val = e.target.value;
												try {
													await updateUserAssignment(emp.User_Id, val);
													setEmployees((prev) => prev.map((p) => p.User_Id === emp.User_Id ? ({ ...p, pre_assigned_role: val }) : p));
													toast({ title: 'Saved', description: 'Assignment updated' });
												} catch (error) {
													const message = error instanceof Error ? error.message : 'Failed to update assignment';
													toast({ title: 'Error', description: message, variant: 'destructive' });
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
