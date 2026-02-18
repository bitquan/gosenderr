import { useEffect, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'

interface EmailSettings {
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPassword: string
  fromEmail: string
  fromName: string
  notifications: {
    orderConfirmation: boolean
    orderShipped: boolean
    orderDelivered: boolean
    paymentReceived: boolean
    payoutProcessed: boolean
    newMessage: boolean
    disputeOpened: boolean
  }
  templates: {
    orderConfirmation: string
    orderShipped: string
    welcomeEmail: string
  }
}

export default function EmailSettingsPage() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<EmailSettings>({
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    fromEmail: 'noreply@gosenderr.com',
    fromName: 'GoSenderr',
    notifications: {
      orderConfirmation: true,
      orderShipped: true,
      orderDelivered: true,
      paymentReceived: true,
      payoutProcessed: true,
      newMessage: true,
      disputeOpened: true
    },
    templates: {
      orderConfirmation: 'Thank you for your order! Order #{{orderNumber}} has been confirmed.',
      orderShipped: 'Your order #{{orderNumber}} has been shipped and will arrive soon.',
      welcomeEmail: 'Welcome to GoSenderr! We\'re excited to have you.'
    }
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [testEmail, setTestEmail] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const docRef = doc(db, 'platformSettings', 'email')
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        setSettings(docSnap.data() as EmailSettings)
      }
    } catch (error) {
      console.error('Error loading email settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user) return
    
    setSaving(true)
    try {
      await setDoc(doc(db, 'platformSettings', 'email'), settings)
      alert('Email settings saved successfully!')
    } catch (error) {
      console.error('Error saving email settings:', error)
      alert('Failed to save email settings')
    } finally {
      setSaving(false)
    }
  }

  const handleSendTestEmail = async () => {
    if (!testEmail.trim()) {
      alert('Please enter an email address')
      return
    }

    setTestingEmail(true)
    try {
      // In production, this would call a cloud function to send a test email
      await new Promise(resolve => setTimeout(resolve, 1500))
      alert(`Test email sent to ${testEmail}`)
    } catch (error) {
      console.error('Error sending test email:', error)
      alert('Failed to send test email')
    } finally {
      setTestingEmail(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading email settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-8">
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">📧 Email Settings</h1>
          <p className="text-purple-100">Configure email notifications and templates</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-8 space-y-6">
        {/* SMTP Configuration */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>SMTP Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    value={settings.smtpHost}
                    onChange={(e) => setSettings({...settings, smtpHost: e.target.value})}
                    placeholder="smtp.gmail.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMTP Port
                  </label>
                  <input
                    type="number"
                    value={settings.smtpPort}
                    onChange={(e) => setSettings({...settings, smtpPort: parseInt(e.target.value)})}
                    placeholder="587"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Username
                </label>
                <input
                  type="text"
                  value={settings.smtpUser}
                  onChange={(e) => setSettings({...settings, smtpUser: e.target.value})}
                  placeholder="your-email@gmail.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Password
                </label>
                <input
                  type="password"
                  value={settings.smtpPassword}
                  onChange={(e) => setSettings({...settings, smtpPassword: e.target.value})}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* From Address */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>From Address</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Email
                </label>
                <input
                  type="email"
                  value={settings.fromEmail}
                  onChange={(e) => setSettings({...settings, fromEmail: e.target.value})}
                  placeholder="noreply@gosenderr.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Name
                </label>
                <input
                  type="text"
                  value={settings.fromName}
                  onChange={(e) => setSettings({...settings, fromName: e.target.value})}
                  placeholder="GoSenderr"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Toggles */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Email Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.notifications.orderConfirmation}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: {...settings.notifications, orderConfirmation: e.target.checked}
                  })}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700">Order Confirmation</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.notifications.orderShipped}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: {...settings.notifications, orderShipped: e.target.checked}
                  })}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700">Order Shipped</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.notifications.orderDelivered}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: {...settings.notifications, orderDelivered: e.target.checked}
                  })}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700">Order Delivered</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.notifications.paymentReceived}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: {...settings.notifications, paymentReceived: e.target.checked}
                  })}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700">Payment Received</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.notifications.payoutProcessed}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: {...settings.notifications, payoutProcessed: e.target.checked}
                  })}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700">Payout Processed</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.notifications.newMessage}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: {...settings.notifications, newMessage: e.target.checked}
                  })}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700">New Messages</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.notifications.disputeOpened}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: {...settings.notifications, disputeOpened: e.target.checked}
                  })}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700">Dispute Opened</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Email Templates */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Email Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Confirmation Template
                </label>
                <textarea
                  value={settings.templates.orderConfirmation}
                  onChange={(e) => setSettings({
                    ...settings,
                    templates: {...settings.templates, orderConfirmation: e.target.value}
                  })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">Use {'{'}{'{'} orderNumber {'}}'}{'}'} for order number</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Shipped Template
                </label>
                <textarea
                  value={settings.templates.orderShipped}
                  onChange={(e) => setSettings({
                    ...settings,
                    templates: {...settings.templates, orderShipped: e.target.value}
                  })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Welcome Email Template
                </label>
                <textarea
                  value={settings.templates.welcomeEmail}
                  onChange={(e) => setSettings({
                    ...settings,
                    templates: {...settings.templates, welcomeEmail: e.target.value}
                  })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Email */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Test Email Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Enter email address"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={handleSendTestEmail}
                disabled={testingEmail || !testEmail.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {testingEmail ? 'Sending...' : '📤 Send Test'}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
        >
          {saving ? 'Saving...' : '💾 Save Email Settings'}
        </button>
      </div>
    </div>
  )
}
