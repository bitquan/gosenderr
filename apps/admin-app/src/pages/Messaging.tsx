import { useEffect, useState } from 'react'
import { collection, query, getDocs, addDoc, Timestamp, where, orderBy, updateDoc, doc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../lib/firebase'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'
import { useFeatureFlags } from '../hooks/useFeatureFlags'

interface Message {
  id: string
  recipientId: string
  recipientEmail: string
  subject: string
  body: string
  type: 'notification' | 'announcement' | 'warning' | 'alert'
  read: boolean
  createdAt: any
  sentBy: string
  orderId?: string
  userId?: string
}

interface User {
  id: string
  email: string
  name?: string
  role?: string
}

export default function MessagingPage() {
  const { flags } = useFeatureFlags()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [showComposeModal, setShowComposeModal] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread' | 'notification' | 'announcement' | 'warning' | 'alert'>('all')
  const [sending, setSending] = useState(false)
  const [sendToAll, setSendToAll] = useState(false)

  // Form states
  const [recipientId, setRecipientId] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [messageType, setMessageType] = useState<'notification' | 'announcement' | 'warning' | 'alert'>('notification')
  const [testToken, setTestToken] = useState('')
  const [testUserId, setTestUserId] = useState('')
  const [testTitle, setTestTitle] = useState('GoSenderr Test')
  const [testBody, setTestBody] = useState('Admin test push')
  const [testSending, setTestSending] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const pushTestEnabled = flags?.advanced?.pushNotifications !== false

  useEffect(() => {
    loadMessages()
    loadUsers()
  }, [])

  const loadMessages = async () => {
    try {
      setLoading(true)
      const messagesQuery = query(
        collection(db, 'adminMessages'),
        orderBy('createdAt', 'desc')
      )
      const messagesSnap = await getDocs(messagesQuery)
      const msgs = messagesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[]
      setMessages(msgs)
    } catch (error) {
      console.error('Error loading messages:', error)
      // If collection doesn't exist or permission denied, start with empty
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const usersSnap = await getDocs(collection(db, 'users'))
      const usersData = usersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[]
      setUsers(usersData.sort((a, b) => (a.email || '').localeCompare(b.email || '')))
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const handleSendMessage = async () => {
    if ((!recipientId && !sendToAll) || !subject.trim() || !body.trim()) {
      alert('Please fill in all required fields')
      return
    }

    // Confirm if sending to all users
    if (sendToAll && !window.confirm(`Send this message to all ${users.length} users?`)) {
      return
    }

    setSending(true)
    try {
      if (sendToAll) {
        // Send to all users
        for (const user of users) {
          await addDoc(collection(db, 'adminMessages'), {
            recipientId: user.id,
            recipientEmail: user.email,
            subject,
            body,
            type: messageType,
            read: false,
            createdAt: Timestamp.now(),
            sentBy: 'admin@example.com',
            broadcastMessage: true
          })
        }

        // Log broadcast action
        await addDoc(collection(db, 'adminLogs'), {
          action: 'broadcast_message_sent',
          timestamp: Timestamp.now(),
          adminEmail: 'admin@example.com',
          details: {
            subject,
            type: messageType,
            recipientCount: users.length
          }
        })
      } else {
        // Send to individual user
        const selectedUser = users.find(u => u.id === recipientId)
        await addDoc(collection(db, 'adminMessages'), {
          recipientId,
          recipientEmail: selectedUser?.email,
          subject,
          body,
          type: messageType,
          read: false,
          createdAt: Timestamp.now(),
          sentBy: 'admin@example.com'
        })

        // Log to audit logs
        await addDoc(collection(db, 'adminLogs'), {
          action: 'message_sent',
          userId: recipientId,
          timestamp: Timestamp.now(),
          adminEmail: 'admin@example.com',
          details: {
            subject,
            type: messageType,
            recipientEmail: selectedUser?.email
          }
        })
      }

      setRecipientId('')
      setSubject('')
      setBody('')
      setMessageType('notification')
      setSendToAll(false)
      setShowComposeModal(false)
      await loadMessages()
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleMarkAsRead = async (message: Message) => {
    try {
      if (!message.read) {
        await updateDoc(doc(db, 'adminMessages', message.id), {
          read: true
        })
        await loadMessages()
      }
    } catch (error) {
      console.error('Error marking message as read:', error)
    }
  }

  const filteredMessages = messages.filter(msg => {
    if (filter === 'all') return true
    if (filter === 'unread') return !msg.read
    return msg.type === filter
  })

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'notification':
        return 'bg-blue-100 text-blue-800'
      case 'announcement':
        return 'bg-green-100 text-green-800'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800'
      case 'alert':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'notification':
        return '📬'
      case 'announcement':
        return '📢'
      case 'warning':
        return '⚠️'
      case 'alert':
        return '🚨'
      default:
        return '📧'
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate?.() || new Date(timestamp)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const handleSendTestPush = async () => {
    if (!pushTestEnabled) return
    if (!testToken.trim() && !testUserId) {
      alert('Provide a token or select a user')
      return
    }
    setTestSending(true)
    setTestResult(null)
    try {
      const sendTestPush = httpsCallable(functions, 'sendTestPush')
      const payload = {
        token: testToken.trim() || undefined,
        userId: testUserId || undefined,
        title: testTitle.trim(),
        body: testBody.trim(),
        apnsTopic: 'com.gosenderr.courier',
      }
      const result = await sendTestPush(payload)
      setTestResult(`✅ Sent: ${JSON.stringify(result.data)}`)
    } catch (error: any) {
      console.error('Failed to send test push', error)
      setTestResult(`❌ Failed: ${error?.message || 'Unknown error'}`)
    } finally {
      setTestSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">💬 Admin Messaging</h1>
          <p className="text-purple-100">Send notifications and messages to platform users</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-6 space-y-4">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>🔔 Test Push Notification</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {!pushTestEnabled && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Test push is disabled by feature flag (advanced.pushNotifications). Enable it to send.
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target User</label>
                <select
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  value={testUserId}
                  onChange={(e) => {
                    const nextId = e.target.value
                    setTestUserId(nextId)
                    if (nextId) {
                      const user = users.find((u) => u.id === nextId) as any
                      const token = user?.courierProfile?.fcmToken || user?.fcmToken || ''
                      if (token) setTestToken(token)
                    }
                  }}
                >
                  <option value="">Select a user (optional)</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email || user.id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">FCM Token</label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  placeholder="Paste FCM token"
                  value={testToken}
                  onChange={(e) => setTestToken(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  value={testBody}
                  onChange={(e) => setTestBody(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                className="rounded-lg bg-purple-600 px-4 py-2 text-white font-semibold shadow hover:bg-purple-700 disabled:opacity-60"
                onClick={handleSendTestPush}
                disabled={testSending || !pushTestEnabled}
              >
                {testSending ? 'Sending…' : 'Send Test Push'}
              </button>
              {testResult && <p className="text-sm text-gray-700">{testResult}</p>}
            </div>
          </CardContent>
        </Card>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card variant="elevated">
            <CardContent className="p-6">
              <p className="text-sm text-gray-500 font-semibold">Total Messages</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{messages.length}</p>
              <p className="text-xs text-gray-600 mt-1">All time</p>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6">
              <p className="text-sm text-gray-500 font-semibold">Unread</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{messages.filter(m => !m.read).length}</p>
              <p className="text-xs text-gray-600 mt-1">Awaiting review</p>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6">
              <p className="text-sm text-gray-500 font-semibold">Announcements</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{messages.filter(m => m.type === 'announcement').length}</p>
              <p className="text-xs text-gray-600 mt-1">Platform wide</p>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6">
              <p className="text-sm text-gray-500 font-semibold">Recipients</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{new Set(messages.map(m => m.recipientId)).size}</p>
              <p className="text-xs text-gray-600 mt-1">Unique users</p>
            </CardContent>
          </Card>
        </div>

        {/* Compose Button */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowComposeModal(true)}
            className="px-6 py-3 bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] text-white rounded-lg hover:shadow-lg transition font-semibold"
          >
            ✉️ Compose Message
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-2 flex-wrap">
          {(['all', 'unread', 'notification', 'announcement', 'warning', 'alert'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                filter === f
                  ? 'bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="capitalize">{f === 'all' ? 'All' : f}</span>
            </button>
          ))}
        </div>

        {/* Messages List */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Messages ({filteredMessages.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">Loading messages...</div>
            ) : filteredMessages.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-6xl mb-4">💬</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Messages</h3>
                <p className="text-gray-600">
                  {filter !== 'all' ? `No ${filter} messages found` : 'No messages have been sent yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMessages.map((message) => (
                  <button
                    key={message.id}
                    onClick={() => {
                      setSelectedMessage(message)
                      handleMarkAsRead(message)
                    }}
                    className="w-full text-left"
                  >
                    <Card variant="elevated" className={`hover:shadow-lg transition-all cursor-pointer ${!message.read ? 'border-l-4 border-purple-600' : ''}`}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <span className="text-2xl">{getTypeIcon(message.type)}</span>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${getTypeColor(message.type)}`}>
                                {message.type.toUpperCase()}
                              </span>
                              {!message.read && (
                                <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
                                  NEW
                                </span>
                              )}
                            </div>
                            <p className="font-semibold text-gray-900 mb-1">{message.subject}</p>
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{message.body}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                              <span>👤 {message.recipientEmail}</span>
                              <span>📅 {formatDate(message.createdAt)}</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-semibold text-gray-900">
                              {message.read ? '✓ Read' : 'Unread'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] p-6 text-white flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{getTypeIcon(selectedMessage.type)} {selectedMessage.subject}</h2>
                <p className="text-purple-100 text-sm mt-1">To: {selectedMessage.recipientEmail}</p>
              </div>
              <button
                onClick={() => setSelectedMessage(null)}
                className="text-2xl hover:opacity-80"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Message Info */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 font-semibold">Type</p>
                    <p className={`inline-block px-3 py-1 rounded text-xs font-bold mt-1 ${getTypeColor(selectedMessage.type)}`}>
                      {selectedMessage.type.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-semibold">Status</p>
                    <p className="text-gray-900 mt-1 font-semibold">{selectedMessage.read ? '✓ Read' : 'Unread'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 font-semibold">Recipient</p>
                    <p className="text-gray-900">{selectedMessage.recipientEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-semibold">Sent</p>
                    <p className="text-gray-900">{formatDate(selectedMessage.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Message Body */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedMessage.body}</p>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compose Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] p-6 text-white flex items-center justify-between">
              <h2 className="text-2xl font-bold">✉️ Compose Message</h2>
              <button
                onClick={() => {
                  setShowComposeModal(false)
                  setRecipientId('')
                  setSubject('')
                  setBody('')
                  setMessageType('notification')
                }}
                className="text-2xl hover:opacity-80"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Send to Individual or All */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Recipient *</label>
                <div className="space-y-3">
                  <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    !sendToAll
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-300 hover:border-purple-300'
                  }`}>
                    <input
                      type="radio"
                      name="sendMode"
                      checked={!sendToAll}
                      onChange={() => setSendToAll(false)}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">Send to Individual User</p>
                      <p className="text-xs text-gray-600 mt-1">Select a specific user to receive the message</p>
                    </div>
                  </label>

                  {!sendToAll && (
                    <select
                      value={recipientId}
                      onChange={(e) => setRecipientId(e.target.value)}
                      className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Select a user...</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.email} {user.name && `(${user.name})`} {user.role && `- ${user.role}`}
                        </option>
                      ))}
                    </select>
                  )}

                  <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    sendToAll
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-green-300'
                  }`}>
                    <input
                      type="radio"
                      name="sendMode"
                      checked={sendToAll}
                      onChange={() => setSendToAll(true)}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">📢 Send to All Users</p>
                      <p className="text-xs text-gray-600 mt-1">Broadcast to all {users.length} users on the platform</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Message Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Message Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['notification', 'announcement', 'warning', 'alert'] as const).map((type) => (
                    <label
                      key={type}
                      className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                        messageType === type
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-300 hover:border-purple-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="messageType"
                        value={type}
                        checked={messageType === type}
                        onChange={(e) => setMessageType(e.target.value as any)}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium capitalize">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Subject *</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Message subject..."
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Message *</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your message here..."
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 h-40 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowComposeModal(false)
                    setRecipientId('')
                    setSubject('')
                    setBody('')
                    setMessageType('notification')
                    setSendToAll(false)
                  }}
                  disabled={sending}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={(!recipientId && !sendToAll) || !subject.trim() || !body.trim() || sending}
                  className="flex-1 px-4 py-3 bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] text-white rounded-lg hover:shadow-lg transition font-semibold disabled:opacity-50"
                >
                  {sending ? 'Sending...' : sendToAll ? `Send to ${users.length} Users` : 'Send Message'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
