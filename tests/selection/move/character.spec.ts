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
    const selection = editor.getSelection()
    
    selection.collapse(firstText, 6) // end of "Hello "
    selection.modify('move', 'forward', 'character')
    
    const strongText = editor.document.querySelector('strong')!.firstChild! // "World"
    expect(selection.focus?.node).toBe(strongText)
    expect(selection.focus?.offset).toBe(1) // first character of "World"
  })

  it('should move backward from inline element to text', () => {
    const editor = setupEditor(`<p>Hello <strong>World</strong></p>`)
    const strongText = editor.document.querySelector('strong')!.firstChild! // "World"
    const selection = editor.getSelection()
    
    selection.collapse(strongText, 0) // start of "World"
    selection.modify('move', 'backward', 'character')
    
    const firstText = editor.document.querySelector('p')!.firstChild! // "Hello "
    expect(selection.focus?.node).toBe(firstText)
    expect(selection.focus?.offset).toBe(5) // end of "Hello" (before space)
  })

  it('should move from one block to another block', () => {
    const editor = setupEditor(`<p>First</p><p>Second</p>`)
    const firstText = editor.document.querySelector('p')!.firstChild! // "First"
    const selection = editor.getSelection()
    
    selection.collapse(firstText, 5) // end of "First"
    selection.modify('move', 'forward', 'character')
    
    // Should move to start of "Second"
    const secondText = editor.document.querySelectorAll('p')[1].firstChild! // "Second"
    expect(selection.focus?.node).toBe(secondText)
    expect(selection.focus?.offset).toBe(1) // first character of "Second"
  })

  it('should move backward from one block to another block', () => {
    const editor = setupEditor(`<p>First</p><p>Second</p>`)
    const secondText = editor.document.querySelectorAll('p')[1].firstChild! // "Second"
    const selection = editor.getSelection()
    
    selection.collapse(secondText, 0) // start of "Second"
    selection.modify('move', 'backward', 'character')
    
    // Should move to end of "First"
    const firstText = editor.document.querySelector('p')!.firstChild! // "First"
    expect(selection.focus?.node).toBe(firstText)
    expect(selection.focus?.offset).toBe(4) // end of "First" (before last character)
  })

  it('should treat CSS-styled inline elements as inline', () => {
    const editor = setupEditor(`<p>Hello <span style="display: inline-block">Inline</span> World</p>`)
    const firstText = editor.document.querySelector('p')!.firstChild! // "Hello "
    const selection = editor.getSelection()
    
    selection.collapse(firstText, 6) // end of "Hello "
    selection.modify('move', 'forward', 'character')
    
    // Should move into the inline-block span (which contains "inline")
    const spanText = editor.document.querySelector('span')!.firstChild! // "Inline"
    expect(selection.focus?.node).toBe(spanText)
    expect(selection.focus?.offset).toBe(1) // first character of "Inline"
  })
})