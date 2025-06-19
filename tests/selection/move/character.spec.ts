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

  it('should move backward one character in text', () => {
    const editor = setupEditor(`<span>Hello</span>`)
    const text = editor.document.querySelector('span')!.firstChild!
    const selection = editor.getSelection()

    selection.collapse(text, 2)
    selection.modify('move', 'backward', 'character')

    expect(selection.focus?.node).toBe(text)
    expect(selection.focus?.offset).toBe(1)
  })

  it('should stay at end when moving forward at text boundary', () => {
    const editor = setupEditor(`<span>Hello</span>`)
    const text = editor.document.querySelector('span')!.firstChild!
    const selection = editor.getSelection()

    selection.collapse(text, 5) // end of "Hello"
    selection.modify('move', 'forward', 'character')

    expect(selection.focus?.node).toBe(text)
    expect(selection.focus?.offset).toBe(5)
  })

  it('should stay at start when moving backward at text boundary', () => {
    const editor = setupEditor(`<span>Hello</span>`)
    const text = editor.document.querySelector('span')!.firstChild!
    const selection = editor.getSelection()

    selection.collapse(text, 0) // start of "Hello"
    selection.modify('move', 'backward', 'character')

    expect(selection.focus?.node).toBe(text)
    expect(selection.focus?.offset).toBe(0)
  })

  it('should move forward from text into inline element', () => {
    const editor = setupEditor(`<p>Hello <strong>World</strong></p>`)
    const firstText = editor.document.querySelector('p')!.firstChild! // "Hello "
    const strongText = editor.document.querySelector('strong')!.firstChild! // "World"
    const selection = editor.getSelection()

    selection.collapse(firstText, 6) // end of "Hello "

    expect(selection.focus?.node).toBe(strongText)
    expect(selection.focus?.offset).toBe(0) // first character of "World"

    selection.modify('move', 'forward', 'character')

    expect(selection.focus?.node).toBe(strongText)
    expect(selection.focus?.offset).toBe(1) // first character of "World"
  })

  it('should move backward from inline element to text', () => {
    const editor = setupEditor(`<p><strong>World</strong>Hello</p>`)
    const strongText = editor.document.querySelector('strong')!.firstChild! // "World"
    const lastChild = editor.document.querySelector('p')!.lastChild! // "Hello "
    const selection = editor.getSelection()

    selection.collapse(strongText, 5) // start of "World"
    expect(selection.focus?.node).toBe(strongText)
    expect(selection.focus?.offset).toBe(5) // end of "Hello" (before space)

    selection.modify('move', 'forward', 'character')

    expect(selection.focus?.node).toBe(lastChild)
    expect(selection.focus?.offset).toBe(1) // end of "Hello" (before space)
  })

  it('should stay at current mark when at mark-to-mark boundary', () => {
    const editor = setupEditor(`<p><strong>First</strong><em>Second</em></p>`)
    const strongText = editor.document.querySelector('strong')!.firstChild! // "First"
    const emText = editor.document.querySelector('em')!.firstChild! // "Second"
    const selection = editor.getSelection()

    selection.collapse(strongText, 5) // end of "First"

    // 경계에서는 앞쪽(현재) mark를 우선해서 현재 위치에 유지
    expect(selection.focus?.node).toBe(strongText)
    expect(selection.focus?.offset).toBe(5)

    selection.modify('move', 'forward', 'character')

    // move 호출 후에는 다음 mark로 이동
    expect(selection.focus?.node).toBe(emText)
    expect(selection.focus?.offset).toBe(1)
  })

  it('should move backward from start of a block to end of previous block', () => {
    const editor = setupEditor(`<p>First</p><p>Second</p>`)
    const firstText = editor.document.querySelector('p:first-child')!.firstChild! // "First"
    const secondText = editor.document.querySelector('p:last-child')!.firstChild! // "Second"
    const selection = editor.getSelection()

    selection.collapse(secondText, 0) // start of "Second"
    selection.modify('move', 'backward', 'character')

    expect(selection.focus?.node).toBe(firstText)
    expect(selection.focus?.offset).toBe(5) // end of "First"
  })
})
