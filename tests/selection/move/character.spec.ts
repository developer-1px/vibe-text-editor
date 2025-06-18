import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Editor } from '@/main'

describe('Character movement', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.parentNode?.removeChild(container)
  })

  function setupEditor(html: string): Editor {
    container.innerHTML = html
    return new Editor(container)
  }

  // TDD: Start with the simplest test case
  it('should move forward one character in text', () => {
    const editor = setupEditor(`<span>Hello</span>`)
    const text = editor.document.querySelector('span')!.firstChild!
    const selection = editor.getSelection()
    
    selection.collapse(text, 0)
    selection.modify('move', 'forward', 'character')
    
    expect(selection.focus?.node).toBe(text)
    expect(selection.focus?.offset).toBe(1)
  })
})