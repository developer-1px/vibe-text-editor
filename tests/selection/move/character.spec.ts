import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Editor } from '@/main'

describe('Character movement', () => {
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

  it('moves forward over text into atomic block', () => {
    const editor = setupEditor(`<span>Hello</span><hr class="atomic-component" /><span>World</span>`)

    const firstText = editor.document.querySelector('span')!.firstChild as Text
    const selection = editor.getSelection()
    selection.collapse(firstText, firstText.length)
    selection.modify('move', 'forward', 'character')

    expect(selection.focus?.node).toBe(editor.document.querySelector('hr'))
    expect(selection.focus?.offset).toBe(0)
  })

  it('moves backward from text into atomic block', () => {
    const editor = setupEditor(`<span>Hello</span><hr class="atomic-component" /><span>World</span>`)

    const secondSpan = editor.document.querySelectorAll('span')[1]
    const secondText = secondSpan.firstChild as Text
    const selection = editor.getSelection()
    selection.collapse(secondText, 0)
    selection.modify('move', 'backward', 'character')

    expect(selection.focus?.node).toBe(editor.document.querySelector('hr'))
    expect(selection.focus?.offset).toBe(1)
  })

  it('moves forward from atomic block into text', () => {
    const editor = setupEditor(`<span>Hello</span><hr class="atomic-component" /><span>World</span>`)

    const atomicElement = editor.document.querySelector('hr')!
    const selection = editor.getSelection()

    selection.collapse(atomicElement, 0)
    selection.modify('move', 'forward', 'character')

    expect(selection.focus?.node).toBe(atomicElement)
    expect(selection.focus?.offset).toBe(1)
  })

  it('moves backward from atomic block into text', () => {
    const editor = setupEditor(`<span>Hello</span><hr class="atomic-component" /><span>World</span>`)

    const atomicElement = editor.document.querySelector('hr')!
    const selection = editor.getSelection()

    selection.collapse(atomicElement, 1)
    selection.modify('move', 'backward', 'character')

    expect(selection.focus?.node).toBe(atomicElement)
    expect(selection.focus?.offset).toBe(0)
  })

  it('moves forward between atomic blocks', () => {
    const editor = setupEditor(`<hr class="atomic-component" /><hr class="atomic-component" />`)

    const firstAtomicElement = editor.document.querySelector('hr')!
    const selection = editor.getSelection()
    selection.collapse(firstAtomicElement, 0)
    selection.modify('move', 'forward', 'character')

    expect(selection.focus?.node).toBe(firstAtomicElement)
    expect(selection.focus?.offset).toBe(1)
  })

  it('moves backward between atomic blocks', () => {
    const editor = setupEditor(`<hr class="atomic-component" /><hr class="atomic-component" />`)

    const secondAtomicElement = editor.document.querySelectorAll('hr')[1]!
    const selection = editor.getSelection()
    selection.collapse(secondAtomicElement, 1)
    selection.modify('move', 'backward', 'character')

    expect(selection.focus?.node).toBe(secondAtomicElement)
    expect(selection.focus?.offset).toBe(0)
  })

  it('moves forward and backward across <br/> tags', () => {
    // Setup an editor with text separated by a <br/> tag
    const editor = setupEditor(`<span>Line1<br/>Line2</span>`)
    const spanElement = editor.document.querySelector('span')!
    const line1Text = spanElement.firstChild as Text // "Line1"
    const brElement = spanElement.children[0] as HTMLBRElement // <br/>
    const line2Text = spanElement.lastChild as Text // "Line2"

    const selection = editor.getSelection()

    // Test moving forward over <br/>
    // Collapse to the end of "Line1"
    selection.collapse(line1Text, line1Text.length)
    selection.modify('move', 'forward', 'character')

    // After moving forward from "Line1" (length 5), the focus should be *after* the <br> element
    // within the span. The offset for the span's children would be 1 (index of <br/>).
    // If the behavior is to move to the node *after* <br/>, it would be the start of "Line2".
    // This assertion depends on how your Editor handles selection across <br/>.
    // A common behavior is that selection jumps over the <br/> to the next text node.
    expect(selection.focus?.node).toBe(line2Text)
    expect(selection.focus?.offset).toBe(0)

    // Test moving backward over <br/>
    // Collapse to the beginning of "Line2"
    selection.collapse(brElement, 1)
    selection.modify('move', 'backward', 'character')

    // After moving backward from "Line2", the focus should be *before* the <br> element
    // within the span. Or, if it lands on the node before <br/>, it would be the end of "Line1".
    expect(selection.focus?.node).toBe(line1Text)
    expect(selection.focus?.offset).toBe(line1Text.length)
  })
})
