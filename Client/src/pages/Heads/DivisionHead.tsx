import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { getUsers, getEmployeesByDepartment, normalizeUser, updateUserAssignment, updateUserStatus } from '@/services/api';
import { User } from '@/types';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

const DivisionHead: React.FC = () => {
	const { user } = useAuth();

	const [employees, setEmployees] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [divisionEmployees, setDivisionEmployees] = useState<User[]>([]);
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);

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

	const totalPages = Math.max(1, Math.ceil(employees.length / pageSize));
	const currentPage = Math.min(page, totalPages);
	const pageSlice = employees.slice((currentPage - 1) * pageSize, currentPage * pageSize);
	useEffect(() => { setPage(1); }, [employees, pageSize]);

	return (
		<div className="space-y-6">
			{!user ? <Navigate to="/login" replace /> : null}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-foreground">Manage Employees</h1>
					<p className="text-muted-foreground">Employees in your division</p>
				</div>
				<div className="flex gap-2">
					<Input placeholder="Search employees..." className="w-[220px]" onChange={(e) => {
						const q = e.target.value.toLowerCase();
						setEmployees(divisionEmployees.filter((emp) => [emp.Full_Name, emp.Email, emp.Department, emp.Division || ''].join(' ').toLowerCase().includes(q)));
					}} />
					<Button
						variant="outline"
						className={`!border-primary !text-primary !bg-background ${loading ? 'pointer-events-none' : ''}`}
						aria-disabled={loading}
						onClick={() => void loadEmployees()}
					>
						{loading ? 'Loading…' : 'Refresh'}
					</Button>
					<div className="flex items-center gap-2">
						<span className="text-xs text-muted-foreground">Rows per page</span>
						<Select value={String(pageSize)} onValueChange={(v) => setPageSize(parseInt(v))}>
							<SelectTrigger className="w-[90px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{[5,10,20,50].map((n) => (<SelectItem key={n} value={String(n)}>{n}</SelectItem>))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>

			<div className="rounded-xl border bg-card shadow-card overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="bg-muted/50">
							<TableHead>Name</TableHead>
							<TableHead>Email</TableHead>
							<TableHead>Department</TableHead>
							<TableHead>Division</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Assigned</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{loading ? (
							<TableRow><TableCell colSpan={6} className="h-16 text-center text-black/80">Loading...</TableCell></TableRow>
						) : employees.length === 0 ? (
							<TableRow><TableCell colSpan={6} className="h-16 text-center text-black/80">No employees found</TableCell></TableRow>
						) : (
							pageSlice.map((emp) => (
								<TableRow key={emp.User_Id} className="animate-fade-in">
									<TableCell className="font-medium">{emp.Full_Name}</TableCell>
									<TableCell>{emp.Email}</TableCell>
									<TableCell>{emp.Department}</TableCell>
									<TableCell>{emp.Division}</TableCell>
									<TableCell>
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
											<SelectTrigger className={`w-[140px] ${emp.Status ? 'text-emerald-600' : 'text-red-500'}`}>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="active" className="text-emerald-600">Active</SelectItem>
												<SelectItem value="inactive" className="text-red-500">Inactive</SelectItem>
											</SelectContent>
										</Select>
									</TableCell>
									<TableCell>
										<Select
											value={emp.pre_assigned_role || 'none'}
											onValueChange={async (v) => {
												const val = v === 'none' ? '' : v;
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
											<SelectTrigger className="w-[140px]">
												<SelectValue placeholder="None" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="none">None</SelectItem>
												<SelectItem value="Recorder">Recorder</SelectItem>
												<SelectItem value="Releaser">Releaser</SelectItem>
											</SelectContent>
										</Select>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
				<div className="p-3 border-t grid grid-cols-3 items-center text-sm">
					<div className="justify-self-start">
						<Pagination>
							<PaginationContent>
								<PaginationItem>
									<PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }} />
								</PaginationItem>
							</PaginationContent>
						</Pagination>
					</div>
					<div className="justify-self-center text-xs text-muted-foreground">Page {currentPage} of {totalPages}</div>
					<div className="justify-self-end">
						<Pagination>
							<PaginationContent>
								<PaginationItem>
									<PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)); }} />
								</PaginationItem>
							</PaginationContent>
						</Pagination>
					</div>
				</div>
			</div>
		</div>
	);
};

export default DivisionHead;
