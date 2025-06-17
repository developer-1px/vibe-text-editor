import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Editor } from '@/main'

describe('Line movement', () => {
  let container: HTMLElement
  let editor: Editor

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
    // Assuming an editor.destroy() method for proper cleanup after each test
    // editor.destroy()
  })

  function setupEditor(html: string): Editor {
    container.innerHTML = html
    return new Editor(container)
  }

  it('should move cursor down to the next line', () => {
    // Setup an editor with multiple lines of text
    editor = setupEditor(`
      <div>Line 1</div>
      <div>Line 2</div>
      <div>Line 3</div>
    `)

    const selection = editor.getSelection()
    // Collapse selection at the beginning of the first line
    const firstLineText = editor.document.querySelector('div')?.firstChild as Text
    selection.collapse(firstLineText, 0)

    // Use modify to move 'forward' by 'line'
    selection.modify('move', 'forward', 'line')

    // Expect the selection to have moved to the beginning of the second line
    const secondLineText = editor.document.querySelectorAll('div')[1]?.firstChild as Text
    expect(selection.focus?.node).toBe(secondLineText)
    expect(selection.focus?.offset).toBe(0)
  })

  it('should move cursor up to the previous line', () => {
    // Setup an editor with multiple lines of text
    editor = setupEditor(`
      <div>Line A</div>
      <div>Line B</div>
      <div>Line C</div>
    `)

    const selection = editor.getSelection()
    // Collapse selection at the beginning of the third line
    const thirdLineText = editor.document.querySelectorAll('div')[2]?.firstChild as Text
    selection.collapse(thirdLineText, 0)

    // Use modify to move 'backward' by 'line'
    selection.modify('move', 'backward', 'line')

    // Expect the selection to have moved to the beginning of the second line
    const secondLineText = editor.document.querySelectorAll('div')[1]?.firstChild as Text
    expect(selection.focus?.node).toBe(secondLineText)
    expect(selection.focus?.offset).toBe(0)
  })
})
