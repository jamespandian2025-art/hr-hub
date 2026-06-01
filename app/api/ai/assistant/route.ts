import { requireCsrf } from '@/lib/security/requestGuards'
import { requireVerifiedSession } from '@/lib/security/session'
import { enforceRateLimit, rateLimitPolicies } from '@/lib/security/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AssistantMessage = {
  role: 'user' | 'assistant'
  content: string
}

type AssistantContext = {
  path?: string
  pageTitle?: string
  company?: string
  role?: string
}

const maxMessages = 10
const maxMessageLength = 1400
const defaultModel = 'gpt-5.4-mini'

function jsonError(error: unknown) {
  const status = typeof error === 'object' && error && 'status' in error ? Number(error.status) : 500
  const message = error instanceof Error ? error.message : 'Unexpected assistant error.'
  return Response.json({ ok: false, error: message }, { status: Number.isFinite(status) ? status : 500 })
}

function cleanText(value: unknown, maxLength = maxMessageLength) {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

function normalizeMessages(value: unknown): AssistantMessage[] {
  if (!Array.isArray(value)) return []
  return value
    .slice(-maxMessages)
    .map(item => {
      const role = item && typeof item === 'object' && 'role' in item && item.role === 'assistant' ? 'assistant' : 'user'
      const content = cleanText(item && typeof item === 'object' && 'content' in item ? item.content : '')
      return content ? { role, content } : null
    })
    .filter(Boolean) as AssistantMessage[]
}

function normalizeContext(value: unknown): AssistantContext {
  if (!value || typeof value !== 'object') return {}
  const context = value as Record<string, unknown>
  return {
    path: cleanText(context.path, 180),
    pageTitle: cleanText(context.pageTitle, 140),
    company: cleanText(context.company, 120),
    role: cleanText(context.role, 80),
  }
}

function instructionText(sessionRole: string) {
  return [
    'You are the WiseFlow AI Assistant inside a construction business management system.',
    'Help users with navigation, workflow guidance, invoice/client/project/HR/accounting questions, and operational next steps.',
    'Be concise, practical, and specific to the current page context.',
    'Do not claim that you created, edited, deleted, approved, or sent records. You can guide the user to do it.',
    'If the user asks for sensitive payroll, HR, banking, or client details, remind them to use the authorized page and role permissions.',
    `The authenticated user role is ${sessionRole || 'Unknown'}.`,
  ].join('\n')
}

function transcript(messages: AssistantMessage[], context: AssistantContext) {
  const contextLines = [
    `Current path: ${context.path || 'unknown'}`,
    `Current page: ${context.pageTitle || 'unknown'}`,
    `Company: ${context.company || 'unknown'}`,
    `Client role hint: ${context.role || 'unknown'}`,
  ]
  const messageLines = messages.map(message => `${message.role === 'assistant' ? 'Assistant' : 'User'}: ${message.content}`)
  return `${contextLines.join('\n')}\n\nConversation:\n${messageLines.join('\n')}\n\nReply as WiseFlow AI Assistant.`
}

function latestUserMessage(messages: AssistantMessage[]) {
  return [...messages].reverse().find(message => message.role === 'user')?.content.toLowerCase() || ''
}

function localReply(messages: AssistantMessage[], context: AssistantContext) {
  const latest = latestUserMessage(messages)
  const path = context.path || ''
  if (!latest) {
    return 'I can help you find pages, check what to do next, and walk through invoices, clients, projects, payroll, HR, warehouse, and accounting workflows.'
  }
  if (/invoice|bill to|billing|payment|receivable/.test(latest) || path.includes('/accounting')) {
    return 'For invoices, start in Accounting > Invoices. Choose the client from the Customer dropdown, confirm the auto-filled email and Bill to details, add item lines with the right unit, then set the status before saving. After saving, the invoice should appear under that client record in the client database.'
  }
  if (/client|customer|contact/.test(latest) || path.includes('/people/clients')) {
    return 'For client work, open People > Client Database, select the client, then use the tabs for overview, invoices, contracts, activities, notes, documents, contacts, and history. Client invoice totals and outstanding amounts should update from saved invoices.'
  }
  if (/payroll|payslip|salary|deduction/.test(latest) || path.includes('/hr/payroll')) {
    return 'For payroll, open HR > Payroll, select a payroll cycle, then click an employee payslip row to review the detail popup. Check gross pay, deductions, net pay, pay period, pay date, and status before exporting or downloading payslips.'
  }
  if (/project|task|status|priority|budget/.test(latest) || path.includes('/project-management')) {
    return 'For projects, use Project Management > Projects to update status, priority, budget, dates, and progress. Status and priority dropdowns should use the colored pill style, and project budgets should display in PHP.'
  }
  if (/warehouse|stock|inventory|receiving/.test(latest) || path.includes('/warehouse')) {
    return 'For warehouse work, use Warehouse > Inventory for stock records, Receiving Logs for incoming items, Transfers for movements, and Adjustments for corrections. Keep item names, locations, quantities, and audit notes complete.'
  }
  if (/where|find|go|open|navigate/.test(latest)) {
    return 'Tell me the record or workflow you need, and I can point you to the right WiseFlow page. Common starting points are Dashboard, Accounting > Invoices, People > Client Database, Project Management > Projects, HR > Payroll, and Warehouse > Inventory.'
  }
  return 'I can help with WiseFlow workflows, page navigation, and next steps. Ask me about invoices, clients, projects, payroll, HR, warehouse, procurement, or accounting and I will keep the answer focused.'
}

function extractResponseText(payload: unknown) {
  if (payload && typeof payload === 'object' && 'output_text' in payload && typeof payload.output_text === 'string') {
    return payload.output_text.trim()
  }
  const response = payload as { output?: Array<{ content?: Array<{ text?: string }> }> }
  return response?.output
    ?.flatMap(item => item.content || [])
    .map(item => item.text || '')
    .join('\n')
    .trim() || ''
}

async function createOpenAiReply(messages: AssistantMessage[], context: AssistantContext, sessionRole: string) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || defaultModel,
      instructions: instructionText(sessionRole),
      input: transcript(messages, context),
      max_output_tokens: 700,
    }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload
      ? JSON.stringify(payload.error)
      : `OpenAI request failed with ${response.status}.`
    throw new Error(message)
  }

  return extractResponseText(payload)
}

export async function POST(request: Request) {
  try {
    requireCsrf(request)
    const session = await requireVerifiedSession(request)
    await enforceRateLimit(request, rateLimitPolicies.aiAssistant, session.userId, session.email)

    const payload = await request.json().catch(() => null) as { messages?: unknown; context?: unknown } | null
    const messages = normalizeMessages(payload?.messages)
    const context = normalizeContext(payload?.context)
    if (!messages.some(message => message.role === 'user')) {
      return Response.json({ ok: false, error: 'A user message is required.' }, { status: 400 })
    }

    const aiReply = await createOpenAiReply(messages, context, session.role).catch(() => null)
    return Response.json({
      ok: true,
      reply: aiReply || localReply(messages, context),
      provider: aiReply ? 'openai' : 'local',
      model: aiReply ? (process.env.OPENAI_MODEL || defaultModel) : 'local-help',
    })
  } catch (error) {
    return jsonError(error)
  }
}
