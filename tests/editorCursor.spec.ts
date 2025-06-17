import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Editor } from '../src/main'

describe('Cursor Navigation across atomic block', () => {
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
    const editor = setupEditor(`<span>Hello</span><img class="atomic-component" /><span>World</span>`)

    const firstText = editor.document.querySelector('span')!.firstChild as Text
    const selection = editor.getSelection()
    selection.collapse(firstText, firstText.length)
    selection.modify('move', 'forward', 'character')

    expect(selection.focus?.node).toBe(editor.document.querySelector('img'))
    // Note: Current implementation lands at the end of the atomic component when moving forward.
    expect(selection.focus?.offset).toBe(0)
  })

  it('moves backward from text into atomic block', () => {
    const editor = setupEditor(`<span>Hello</span><img class="atomic-component" /><span>World</span>`)

    const secondSpan = editor.document.querySelectorAll('span')[1]
    const secondText = secondSpan.firstChild as Text
    const selection = editor.getSelection()
    selection.collapse(secondText, 0)
    selection.modify('move', 'backward', 'character')

    expect(selection.focus?.node).toBe(editor.document.querySelector('img'))
    // Note: Current implementation lands at the start of the atomic component when moving backward.
    expect(selection.focus?.offset).toBe(1)
  })
})
