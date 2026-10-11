/**
 * Markdown 安全渲染：marked 解析 + DOMPurify 消毒。
 * 外链自动补 rel="noopener noreferrer" target="_blank"。
 */
import DOMPurify from 'dompurify'
import { marked } from 'marked'

marked.setOptions({ gfm: true, breaks: true })

let hookInstalled = false

function ensureHook() {
  if (hookInstalled) return
  hookInstalled = true
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && 'href' in node) {
      const href = node.getAttribute('href') || ''
      if (/^https?:\/\//i.test(href)) {
        node.setAttribute('target', '_blank')
        node.setAttribute('rel', 'noopener noreferrer')
      }
    }
  })
}

/** 清洗用户输入，用于文章标题、摘要等纯文本场景 */
export function sanitizeText(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}

/** 渲染 Markdown 为安全 HTML */
export async function renderMarkdown(md: string): Promise<string> {
  ensureHook()
  const raw = await marked.parse(md || '')
  return DOMPurify.sanitize(raw, {
    ADD_ATTR: ['target', 'rel', 'id', 'align'],
    FORBID_TAGS: ['style', 'form', 'input', 'button'],
  })
}

export interface TocItem {
  id: string
  text: string
  level: number
}

/** 从渲染后的 HTML 中提取目录（h2/h3） */
export function extractToc(html: string): TocItem[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const items: TocItem[] = []
  const used = new Map<string, number>()
  doc.querySelectorAll('h2, h3').forEach((el) => {
    const text = (el.textContent || '').trim()
    if (!text) return
    let id = slugify(text)
    const count = used.get(id) || 0
    used.set(id, count + 1)
    if (count > 0) id = `${id}-${count}`
    el.setAttribute('id', id)
    items.push({ id, text, level: el.tagName === 'H2' ? 2 : 3 })
  })
  return items
}

/** 用带 id 的目录结果回写 HTML（DOMParser 产物是副本） */
export function attachHeadingIds(html: string): { html: string; toc: TocItem[] } {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const items: TocItem[] = []
  const used = new Map<string, number>()
  doc.querySelectorAll('h2, h3').forEach((el) => {
    const text = (el.textContent || '').trim()
    if (!text) return
    let id = slugify(text)
    const count = used.get(id) || 0
    used.set(id, count + 1)
    if (count > 0) id = `${id}-${count}`
    el.setAttribute('id', id)
    items.push({ id, text, level: el.tagName === 'H2' ? 2 : 3 })
  })
  return { html: doc.body.innerHTML, toc: items }
}

export function slugify(text: string): string {
  return (
    text
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w一-龥-]/g, '') || 'section'
  )
}
