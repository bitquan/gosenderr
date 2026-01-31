// CSV Export Utility Functions

export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) {
    alert('No data to export')
    return
  }

  // Get headers from first object
  const headers = Object.keys(data[0])
  
  // Create CSV content
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        // Handle special characters and quotes
        const stringValue = String(value ?? '')
        const escaped = stringValue.replace(/"/g, '""')
        // Wrap in quotes if contains comma, newline, or quotes
        return /[,\n"]/.test(escaped) ? `"${escaped}"` : escaped
      }).join(',')
    )
  ].join('\n')

  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function formatOrdersForExport(orders: any[]) {
  return orders.map(order => ({
    'Order ID': order.id,
    'Customer Email': order.customerEmail || 'N/A',
    'Customer Name': order.customerName || 'N/A',
    'Total': order.total || 0,
    'Status': order.status,
    'Payment Status': order.paymentStatus || 'N/A',
    'Items Count': order.items?.length || 0,
    'Shipping Address': order.shippingAddress ? 
      `${order.shippingAddress.street}, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}` : 
      'N/A',
    'Created At': order.createdAt?.toDate?.()?.toLocaleString() || 'N/A',
    'Updated At': order.updatedAt?.toDate?.()?.toLocaleString() || 'N/A'
  }))
}

export function formatUsersForExport(users: any[]) {
  return users.map(user => ({
    'User ID': user.id,
    'Email': user.email,
    'Display Name': user.displayName || 'N/A',
    'Phone': user.phoneNumber || 'N/A',
    'Role': user.role || 'customer',
    'Admin': user.admin ? 'Yes' : 'No',
    'Email Verified': user.emailVerified ? 'Yes' : 'No',
    'Status': user.status || 'active',
    'Suspended Until': user.suspendedUntil?.toDate?.()?.toLocaleString() || 'N/A',
    'Banned': user.banned ? 'Yes' : 'No',
    'Created At': user.createdAt?.toDate?.()?.toLocaleString() || 'N/A',
    'Last Login': user.lastLoginAt?.toDate?.()?.toLocaleString() || 'N/A'
  }))
}

export function formatAuditLogsForExport(logs: any[]) {
  return logs.map(log => ({
    'Log ID': log.id,
    'Action': log.action,
    'Admin Email': log.adminEmail,
    'Admin ID': log.adminId,
    'Target User ID': log.userId || 'N/A',
    'Target Item ID': log.itemId || 'N/A',
    'Target Order ID': log.orderId || 'N/A',
    'Item Title': log.itemTitle || 'N/A',
    'Details': log.details ? JSON.stringify(log.details) : 'N/A',
    'Timestamp': log.timestamp?.toDate?.()?.toLocaleString() || 'N/A'
  }))
}

export function formatItemsForExport(items: any[]) {
  return items.map(item => ({
    'Item ID': item.id,
    'Title': item.title,
    'Description': item.description || 'N/A',
    'Price': item.price || 0,
    'Stock': item.stock || 0,
    'Category': item.category || 'N/A',
    'Condition': item.condition || 'N/A',
    'Status': item.status,
    'Featured': item.featured ? 'Yes' : 'No',
    'Seller ID': item.sellerId,
    'Seller Name': item.sellerName || 'N/A',
    'Seller Email': item.sellerEmail || item.vendorEmail || 'N/A',
    'Views': item.views || 0,
    'Sales': item.sales || 0,
    'Images Count': item.images?.length || 0,
    'Created At': item.createdAt?.toDate?.()?.toLocaleString() || 'N/A',
    'Updated At': item.updatedAt?.toDate?.()?.toLocaleString() || 'N/A'
  }))
}

export function formatJobsForExport(jobs: any[]) {
  return jobs.map(job => ({
    'Job ID': job.id,
    'Customer ID': job.customerId,
    'Customer Email': job.customerEmail || 'N/A',
    'Courier ID': job.courierId || 'N/A',
    'Status': job.status,
    'Pickup Address': job.pickupAddress || 'N/A',
    'Delivery Address': job.deliveryAddress || 'N/A',
    'Package Description': job.packageDescription || 'N/A',
    'Agreed Fee': job.agreedFee || 0,
    'Distance': job.distance || 'N/A',
    'Created At': job.createdAt?.toDate?.()?.toLocaleString() || 'N/A',
    'Completed At': job.completedAt?.toDate?.()?.toLocaleString() || 'N/A'
  }))
}
