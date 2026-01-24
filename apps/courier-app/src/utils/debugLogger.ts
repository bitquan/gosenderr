/**
 * Debug logger that outputs markdown-formatted logs to console
 * Copy console output and save as .md file for analysis
 */

interface DebugLogEntry {
  timestamp: string
  type: 'info' | 'error' | 'route' | 'render'
  message: string
  data?: any
}

class DebugLogger {
  private logs: DebugLogEntry[] = []
  private startTime: number = Date.now()

  log(type: DebugLogEntry['type'], message: string, data?: any) {
    const entry: DebugLogEntry = {
      timestamp: new Date().toISOString(),
      type,
      message,
      data
    }
    this.logs.push(entry)
    
    // Log to console in markdown format
    console.log(`[${type.toUpperCase()}] ${message}`, data || '')
  }

  generateMarkdownReport(): string {
    const uptime = Date.now() - this.startTime
    
    let md = `# Courier App Debug Report\n\n`
    md += `**Generated:** ${new Date().toISOString()}\n`
    md += `**Uptime:** ${(uptime / 1000).toFixed(2)}s\n`
    md += `**URL:** ${window.location.href}\n`
    md += `**User Agent:** ${navigator.userAgent}\n\n`
    
    md += `## Environment\n\n`
    md += `- **Origin:** ${window.location.origin}\n`
    md += `- **Protocol:** ${window.location.protocol}\n`
    md += `- **Pathname:** ${window.location.pathname}\n`
    md += `- **Browser:** ${navigator.userAgent}\n\n`
    
    md += `## Logs (${this.logs.length} entries)\n\n`
    
    this.logs.forEach(log => {
      md += `### ${log.type.toUpperCase()} - ${log.timestamp}\n`
      md += `${log.message}\n`
      if (log.data) {
        md += `\`\`\`json\n${JSON.stringify(log.data, null, 2)}\n\`\`\`\n`
      }
      md += `\n`
    })
    
    return md
  }

  printMarkdownReport() {
    const report = this.generateMarkdownReport()
    console.log('\n\n=== MARKDOWN DEBUG REPORT ===\n')
    console.log(report)
    console.log('\n=== END REPORT ===\n')
    console.log('Copy the above markdown and save as debug-report.md')
  }

  downloadReport() {
    const report = this.generateMarkdownReport()
    const blob = new Blob([report], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `courier-debug-${Date.now()}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

export const debugLogger = new DebugLogger()

// Make it globally accessible for manual debugging in browser console
declare global {
  interface Window {
    debugLogger: DebugLogger
    printDebugReport: () => void
    downloadDebugReport: () => void
  }
}

// Setup global access after module loads
setTimeout(() => {
  if (typeof window !== 'undefined') {
    window.debugLogger = debugLogger
    window.printDebugReport = () => debugLogger.printMarkdownReport()
    window.downloadDebugReport = () => debugLogger.downloadReport()
  }
}, 0)
