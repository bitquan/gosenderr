const LOG_KEY = 'adminDesktopClientLogs'
const MAX_LINES = 500

let initialized = false
let logs: string[] = []

type ConsoleMethod = (...args: any[]) => void

const formatArg = (arg: any) => {
  if (typeof arg === 'string') return arg
  if (arg instanceof Error) return arg.stack || arg.message
  try {
    return JSON.stringify(arg)
  } catch {
    return String(arg)
  }
}

const addLog = (level: string, args: any[]) => {
  const message = args.map(formatArg).join(' ')
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}`
  logs.push(line)
  if (logs.length > MAX_LINES) {
    logs = logs.slice(-MAX_LINES)
  }
  try {
    sessionStorage.setItem(LOG_KEY, JSON.stringify(logs))
  } catch {
    // ignore storage errors
  }
}

export const initClientLogs = () => {
  if (initialized) return
  initialized = true

  try {
    const stored = sessionStorage.getItem(LOG_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) logs = parsed
    }
  } catch {
    // ignore storage errors
  }

  const wrap = (level: string, original: ConsoleMethod) => {
    return (...args: any[]) => {
      addLog(level, args)
      original(...args)
    }
  }

  console.log = wrap('log', console.log)
  console.info = wrap('info', console.info)
  console.warn = wrap('warn', console.warn)
  console.error = wrap('error', console.error)

  window.addEventListener('error', (event) => {
    addLog('error', [event.message, event.error])
  })

  window.addEventListener('unhandledrejection', (event) => {
    addLog('error', ['Unhandled rejection', event.reason])
  })
}

export const getClientLogs = () => logs.join('\n')

export const clearClientLogs = () => {
  logs = []
  try {
    sessionStorage.setItem(LOG_KEY, JSON.stringify(logs))
  } catch {
    // ignore storage errors
  }
}
