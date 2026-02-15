import type { ReactNode } from 'react';

import { EmptyState } from '@/components/EmptyState';

export interface DataColumn<T> {
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: DataColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading,
  emptyTitle = 'No data found',
  emptyDescription = 'Try adjusting filters or create a new record.',
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="space-y-2 rounded-2xl border border-border bg-surface p-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={`skeleton-row-${index + 1}`}
            className="animate-shimmer h-12 rounded-lg"
            style={{ animationDelay: `${index * 100}ms` }}
          />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="surface-card overflow-hidden rounded-2xl shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-border bg-surface-inset">
              {columns.map((column) => (
                <th
                  key={column.header}
                  className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-text-muted"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={rowKey(row)}
                className="group border-b border-border-light transition-all last:border-0 hover:bg-surface-hover"
                style={{ animationDelay: `${rowIndex * 30}ms` }}
              >
                {columns.map((column) => (
                  <td
                    key={column.header}
                    className={`px-6 py-4 text-sm text-text-primary ${column.className ?? ''}`}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
