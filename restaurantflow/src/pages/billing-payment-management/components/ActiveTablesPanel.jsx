import React, { useState, useEffect, useRef } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import api from '../../../utils/api';
import Select from '../../../components/ui/Select';

const SAMPLE_TABLES = [
	{
		id: 'tbl-101',
		tableNumber: 1,
		status: 'dining',
		paymentRequested: false,
		waiterName: 'Amit',
		guestCount: 3,
		orderStartTime: new Date(Date.now() - 1000 * 60 * 25),
		items: [
			{ name: 'Paneer Butter Masala', price: 250, quantity: 2 },
			{ name: 'Garlic Naan', price: 40, quantity: 3 }
		],
		totalAmount: 580
	},
	{
		id: 'tbl-102',
		tableNumber: 2,
		status: 'ready_to_bill',
		paymentRequested: true,
		waiterName: 'Sana',
		guestCount: 2,
		orderStartTime: new Date(Date.now() - 1000 * 60 * 55),
		items: [
			{ name: 'Masala Dosa', price: 120, quantity: 1 },
			{ name: 'Filter Coffee', price: 40, quantity: 2 }
		],
		totalAmount: 200
	}
];

const ActiveTablesPanel = ({ tables = [], onSelectTable, selectedTableKey }) => {
	const [activeTables, setActiveTables] = useState([]);
	const [searchTerm, setSearchTerm] = useState('');
	const [sortBy, setSortBy] = useState('table'); // 'table', 'amount', 'time'
	const listRef = useRef(null);

	useEffect(() => {
		// Helper to keep only active/unpaid bills
		const filterActive = (rows) => {
			if (!Array.isArray(rows)) return [];
			return rows.filter(t => {
				if (!t) return false;
				if (t.status && String(t.status).toLowerCase() === 'paid') return false;
				if (t.paidAt) return false;
				if (t.isPaid) return false;
				if (Array.isArray(t.payments) && t.payments.some(p => p && (p.status === 'completed' || String(p.status).toLowerCase() === 'paid'))) return false;
				return true;
			});
		};

		if (tables && tables.length > 0) {
			setActiveTables(filterActive(tables));
			return;
		}

		api.get('/bills')
			.then(res => setActiveTables(filterActive(res.data || [])))
			.catch(() => {
				if (import.meta.env && import.meta.env.DEV) setActiveTables(SAMPLE_TABLES);
				else setActiveTables([]);
			});
	}, [tables]);

	const filteredTables = (activeTables || [])
		.filter(table => {
			if (!table) return false;
			const text = `${table.tableNumber || ''} ${table.waiterName || ''}`;
			return text.toLowerCase().includes((searchTerm || '').toLowerCase());
		})
		.sort((a, b) => {
			switch (sortBy) {
				case 'amount': return (b.totalAmount || 0) - (a.totalAmount || 0);
				case 'time': return (a.orderStartTime || 0) - (b.orderStartTime || 0);
				default: return (a.tableNumber || 0) - (b.tableNumber || 0);
			}
		});

	const getStatusColor = (status, paymentRequested) => {
		if (paymentRequested) return 'text-warning bg-warning/10 border-warning/20';
		if (status === 'ready_to_bill') return 'text-success bg-success/10 border-success/20';
		return 'text-primary bg-primary/10 border-primary/20';
	};

	const getStatusLabel = (status, paymentRequested) => {
		if (paymentRequested) return 'Payment Requested';
		if (status === 'ready_to_bill') return 'Ready to Bill';
		return 'Dining';
	};

	const formatDuration = (startTime) => {
		const start = startTime && startTime.getTime ? startTime.getTime() : new Date(startTime).getTime();
		const minutes = Math.floor((Date.now() - start) / 60000);
		const hours = Math.floor(minutes / 60);
		if (hours > 0) return `${hours}h ${minutes % 60}m`;
		return `${minutes}m`;
	};

	return (
		<div className="h-full flex flex-col bg-card border-r border-border">
			{/* Header */}
			<div className="p-4 border-b border-border">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold text-foreground">Active Tables</h2>
					<div className="flex items-center space-x-2">
						<span className="text-sm text-muted-foreground">{(activeTables || []).length} tables</span>
						<div className="w-2 h-2 bg-success rounded-full animate-pulse" />
					</div>
				</div>

				<div className="space-y-3">
					<div className="relative">
						<Icon name="Search" size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
						<input type="text" placeholder="Search tables or waiters..." value={searchTerm} onChange={e => setSearchTerm(e?.target?.value)} className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
					</div>

					<div className="flex items-center space-x-2">
						<Icon name="ArrowUpDown" size={14} className="text-muted-foreground" />
						<Select
							options={[
								{ value: 'table', label: 'Table Number' },
								{ value: 'amount', label: 'Total Amount' },
								{ value: 'time', label: 'Order Time' }
							]}
							value={sortBy}
							onChange={val => setSortBy(val)}
							className="text-sm"
							clearable={false}
						/>
					</div>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto" ref={listRef}>
				<div className="p-2 space-y-2">
					{filteredTables.map((table, idx) => {
						const key = table?._id || table?.id || `table-${table?.tableNumber || idx}`;
						return (
							<div key={key} ref={el => { if (selectedTableKey && key === selectedTableKey && el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80); }} onClick={() => onSelectTable && onSelectTable(table)} className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-sm ${selectedTableKey === key ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:border-primary/30'}`}>
								<div className="flex items-center justify-between mb-3">
									<div className="flex items-center space-x-3">
										<div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center"><span className="text-sm font-semibold text-primary">{table?.tableNumber}</span></div>
										<div>
											<div className="flex items-center space-x-2">
												<span className="font-medium text-foreground">Table {table?.tableNumber}</span>
												<div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(table?.status, table?.paymentRequested)}`}>{getStatusLabel(table?.status, table?.paymentRequested)}</div>
											</div>
											<div className="flex items-center space-x-4 mt-1">
												<span className="text-xs text-muted-foreground flex items-center"><Icon name="Users" size={12} className="mr-1" />{table?.guestCount} guests</span>
												<span className="text-xs text-muted-foreground flex items-center"><Icon name="Clock" size={12} className="mr-1" />{formatDuration(table?.orderStartTime)}</span>
											</div>
										</div>
									</div>

									{table?.paymentRequested && (<div className="flex items-center text-warning"><Icon name="Bell" size={16} className="animate-pulse" /></div>)}
								</div>

								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<span className="text-sm text-muted-foreground">Waiter: {table?.waiterName}</span>
										<span className="text-sm font-medium text-foreground">${(table?.totalAmount || 0).toFixed(2)}</span>
									</div>

									<div className="text-xs text-muted-foreground">{(table?.items || []).length} items: {(table?.items || []).slice(0,2).map(it => it?.name).join(', ')}{(table?.items || []).length > 2 ? ` +${(table?.items||[]).length - 2} more` : ''}</div>
								</div>

								<div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
									<div className="flex items-center space-x-2">
										{table?.status === 'ready_to_bill' && <div className="w-2 h-2 bg-success rounded-full" />}
										<span className="text-xs text-muted-foreground">{table?.status === 'ready_to_bill' ? 'Ready for billing' : 'Still dining'}</span>
									</div>

									<Button variant="ghost" size="xs" className="text-xs" onClick={(e) => { e?.stopPropagation(); onSelectTable && onSelectTable(table); }}>
										View Bill
										<Icon name="ChevronRight" size={12} className="ml-1" />
									</Button>
								</div>
							</div>
						);
					})}
				</div>

				{filteredTables.length === 0 && (
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4"><Icon name="Receipt" size={24} className="text-muted-foreground" /></div>
						<h3 className="text-sm font-medium text-foreground mb-2">No Active Tables</h3>
						<p className="text-xs text-muted-foreground max-w-48">{searchTerm ? 'No tables match your search criteria' : 'All tables are currently available'}</p>
					</div>
				)}
			</div>
		</div>
	);
};

export default ActiveTablesPanel;

