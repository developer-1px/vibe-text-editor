import { Editor, EditorRange, type EditorSelection } from './main'
import { buildModelFromDOM } from './dom/normalizeDocument'

type KeyBindingCommand = (selection: EditorSelection, event: KeyboardEvent) => void

export const keyBindings: Record<string, KeyBindingCommand> = {
  'Meta+ArrowRight': (selection) => {
    selection.modify('move', 'forward', 'lineboundary')
  },
  'Meta+Shift+ArrowRight': (selection) => {
    selection.modify('extend', 'forward', 'lineboundary')
  },
  'Meta+ArrowLeft': (selection) => {
    selection.modify('move', 'backward', 'lineboundary')
  },
  'Meta+Shift+ArrowLeft': (selection) => {
    selection.modify('extend', 'backward', 'lineboundary')
  },
  'ArrowDown': (selection) => {
    selection.modify('move', 'forward', 'line')
  },
  'Shift+ArrowDown': (selection) => {
    selection.modify('extend', 'forward', 'line')
  },
  'ArrowUp': (selection) => {
    selection.modify('move', 'backward', 'line')
  },
  'Shift+ArrowUp': (selection) => {
    selection.modify('extend', 'backward', 'line')
  },
  'ArrowRight': (selection) => {
    if (!selection.isCollapsed) {
      return selection.collapseToEnd()
    }
    selection.modify('move', 'forward', 'character')
  },
  'Shift+ArrowRight': (selection) => {
    selection.modify('extend', 'forward', 'character')
  },
  'ArrowLeft': (selection) => {
    if (!selection.isCollapsed) {
      return selection.collapseToStart()
    }
    selection.modify('move', 'backward', 'character')
  },
  'Shift+ArrowLeft': (selection) => {
    selection.modify('extend', 'backward', 'character')
  },
  'Backspace': (selection) => {
    if (!selection.isCollapsed) {
      selection.deleteFromDocument()
      return
    }

    // Default behavior: delete a single character backward.
    selection.modify('extend', 'backward', 'character')
    selection.deleteFromDocument()
  },
  'Delete': (selection) => {
    if (selection.isCollapsed) {
      selection.modify('extend', 'forward', 'character')
    }
    selection.deleteFromDocument()
  },
  '`': (selection) => {
    console.log('selection', selection)
  },
}

export function getKeyBindingString(e: KeyboardEvent): string | null {
  const parts: string[] = []

  // 일관된 순서로 수식어를 추가합니다.
  if (e.metaKey) parts.push('Meta')
  if (e.ctrlKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')

  const key = e.key

  // 수식어만 눌린 경우는 바인딩을 생성하지 않습니다.
  if (['Meta', 'Control', 'Alt', 'Shift', 'CapsLock', 'NumLock', 'ScrollLock'].includes(key)) {
    return null
  }

  parts.push(key)

  return parts.join('+')
}

export function main() {
  const editorElement = document.getElementById('editor') as HTMLElement
  const model = buildModelFromDOM(editorElement)
  const editor = new Editor(editorElement, model)

  // Document를 초기에 한번 렌더링합니다.
  editor.renderDocument()

  const onSelectionChange = () => {
    // Selection 변경 시에는 selection 렌더링만 호출합니다.
    editor.render()
  }

  document.addEventListener('selectionchange', onSelectionChange)

  document.onkeydown = (e) => {
    const keyString = getKeyBindingString(e)
    if (!keyString) return

    const command = keyBindings[keyString]
    if (command) {
      e.preventDefault()
      const selection = editor.getSelection()
      command(selection, e)
    }
  }

  document.onmousedown = (e) => {
    e.preventDefault()
    const { clientX, clientY } = e
    const caretPosition = editor.getPositionFromPoint(clientX, clientY)
    if (!caretPosition) return

    const selection = editor.getSelection()
    if (e.shiftKey) {
      selection.extend(caretPosition.nodeId, caretPosition.offset)
    } else {
      selection.collapse(caretPosition.nodeId, caretPosition.offset)
    }

    const onMouseMove = (moveEvent: MouseEvent) => {
      const { clientX: moveX, clientY: moveY } = moveEvent
      const movePosition = editor.getPositionFromPoint(moveX, moveY)
      if (!movePosition) return

      selection.extend(movePosition.nodeId, movePosition.offset)
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  // test
  const mainWalker = editor.createTreeWalker()
  const firstNode = mainWalker.forward().next().value

  const range = new EditorRange(editor)
  if (firstNode) {
    const nodeId = editor.getNodeId(firstNode)
    if (nodeId) {
      range.setStart(nodeId, 0)
    }
  }
  const selection = editor.getSelection()
  selection.setRange(range)

  Array(3)
    .fill(0)
    .forEach(() => {
      selection.modify('move', 'forward', 'character')
    })
}
