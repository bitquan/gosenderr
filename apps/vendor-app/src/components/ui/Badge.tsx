export function Badge({ children, variant = 'default' }: { children: any; variant?: 'default' | 'success' | 'warning' }) {
  const classes = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
  }[variant]

  return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${classes}`}>{children}</span>
}
