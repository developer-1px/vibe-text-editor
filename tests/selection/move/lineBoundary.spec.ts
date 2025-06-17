import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Editor } from '@/main'

describe('Line boundary movement', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  function setupEditor(html: string): Editor {
    container.innerHTML = html
    return new Editor(container)
  }

  it('should move cursor to the end of the line', () => {
    const editor = setupEditor(`<p>
          The selection system now uses the enhanced
          <code>CaretPosition</code> class and <code>Selection</code><br/>class internally, providing rich functionality for cursor positioning
          and text selection management.
        </p>`)
    const textNode = editor.document.querySelector('p')!.firstChild as Text
    const selection = editor.getSelection()
    selection.collapse(textNode, 5) // "Hello World" 중간에 커서 위치

    selection.modify('move', 'forward', 'lineboundary')

    expect(selection.focus?.node).toBe(textNode)
    expect(selection.focus?.offset).toBe(11)
  })

  it('should move cursor to the end of the line', () => {
    const editor = setupEditor('<div>Hello World</div>')
    const textNode = editor.document.querySelector('div')!.firstChild as Text
    const selection = editor.getSelection()
    selection.collapse(textNode, 5) // "Hello World" 중간에 커서 위치

    selection.modify('move', 'forward', 'lineboundary')

    expect(selection.focus?.node).toBe(textNode)
    expect(selection.focus?.offset).toBe(11)
  })

  it('should move cursor to the start of the line', () => {
    const editor = setupEditor('<div>Hello World</div>')
    const textNode = editor.document.querySelector('div')!.firstChild as Text
    const selection = editor.getSelection()
    selection.collapse(textNode, 5)

    selection.modify('move', 'backward', 'lineboundary')

    expect(selection.focus?.node).toBe(textNode)
    expect(selection.focus?.offset).toBe(0)
  })

  it('should move cursor to the end of the line before an atomic hr', () => {
    const editor = setupEditor('<div>Hello<hr>World</div>')
    const hr = editor.document.querySelector('hr')!
    const selection = editor.getSelection()
    selection.collapse(hr, 0)

    selection.modify('move', 'forward', 'lineboundary')

    expect(selection.focus?.node).toBe(hr)
    expect(selection.focus?.offset).toBe(1)
  })

  it('should move cursor to the start of the line after an atomic hr', () => {
    const editor = setupEditor('<div>Hello<hr>World</div>')
    const hr = editor.document.querySelector('hr')!
    const selection = editor.getSelection()
    selection.collapse(hr, 1)

    selection.modify('move', 'backward', 'lineboundary')

    expect(selection.focus?.node).toBe(hr)
    expect(selection.focus?.offset).toBe(0)
  })

  it('should move cursor to line boundary correctly when last item is bolded', () => {
    const editor = setupEditor(`
      <div>Line 1 with <b>bold text</b><br/>Line 2</div>
      <div>Line 3</div>
    `)

    const selection = editor.getSelection()
    const firstLineText = editor.document.querySelector('div')?.firstChild as Text

    // Start at the beginning of "Line 1 with "
    selection.collapse(firstLineText, 0)

    // Move to the end of the line using 'lineboundary' forward
    selection.modify('move', 'forward', 'lineboundary')

    const boldElement = editor.document.querySelector('b') as HTMLElement
    const boldTextNode = boldElement.firstChild as Text

    // Expect the selection to be at the very end of the line, after the bolded text.
    // This means the focus node should be the parent div, and the offset should be 1 (after its child 'b' element).
    // Or, if the implementation places it inside the bold text, it should be at the end of the bold text node.
    // This assertion might need adjustment based on the exact DOM structure after the bold tag.
    // A common behavior is to land after the last child of the line container.
    expect(selection.focus?.node).toBe(boldTextNode)
    expect(selection.focus?.offset).toBe(boldTextNode.length)

    // Now, test moving backward from the end of the line
    selection.collapse(boldTextNode, boldTextNode.length) // Ensure we are at the end

    // Move to the beginning of the line using 'lineboundary' backward
    selection.modify('move', 'backward', 'lineboundary')

    // Expect the selection to be at the very beginning of the first line
    expect(selection.focus?.node).toBe(firstLineText)
    expect(selection.focus?.offset).toBe(0)
  })
})
