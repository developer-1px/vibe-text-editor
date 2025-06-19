import { calculateVerticalOverlapRatio } from './DOMRect'
import { type Editor, EditorRange, getAfterOffset } from '../main'

export class EditorRangeRectWalker {
  editor: Editor

  constructor(editor: Editor) {
    this.editor = editor
  }

  /**
   * 지정된 방향으로 Rect를 순회하며, 각 Rect에 대한 상대적 줄 번호를 함께 반환합니다.
   * @param startNode 순회를 시작할 노드
   * @param startOffset 시작 노드 내의 오프셋
   * @param direction 순회 방향 ('forward' 또는 'backward')
   */
  *walk(
    startNode: Node,
    startOffset: number = 0,
    direction: 'forward' | 'backward',
  ): Generator<{ node: Node; rect: DOMRect; lineOffset: number; lineBoundary: boolean; offset: number }> {
    let lineOffset = 0
    let lineAnchorRect: DOMRect | null = null
    let lineBoundary = true
    const lineOffsetIncrement = direction === 'forward' ? 1 : -1

    const processNode = function* (node: Node, rects: DOMRect[]) {
      for (const rect of rects) {
        if (!lineAnchorRect) {
          lineAnchorRect = rect
        } else if (calculateVerticalOverlapRatio(lineAnchorRect, rect) < 0.5) {
          lineBoundary = false
          if (direction === 'forward' && lineAnchorRect.bottom > rect.bottom) {
            continue
          } else if (direction === 'backward' && lineAnchorRect.top < rect.top) {
            continue
          }
          lineOffset += lineOffsetIncrement
          lineAnchorRect = rect
        }

        yield { node, rect, lineOffset, lineBoundary, offset: 0 }
      }
    }

    const iteratorWalker = this.editor.createTreeWalker()
    iteratorWalker.currentNode = startNode
    const iterator = direction === 'forward' ? iteratorWalker.forward() : iteratorWalker.backward()

    const range = new EditorRange(this.editor)
    const startNodeId = this.editor.getNodeId(startNode)
    if (!startNodeId) return

    // Handle startNode with offset
    const firstNode = iterator.next().value
    const reversed = direction === 'backward'

    if (firstNode) {
      const firstNodeId = this.editor.getNodeId(firstNode)
      if (firstNodeId) {
        if (direction === 'forward') {
          range.setStart(firstNodeId, startOffset)
          yield* processNode(firstNode, range.getClientRects().slice(0, 1))
          range.setEnd(firstNodeId, getAfterOffset(firstNode))
        } else {
          range.setEnd(firstNodeId, startOffset)
          yield* processNode(firstNode, range.getClientRects().slice(0, 1))
          range.setStart(firstNodeId, 0)
        }
        yield* processNode(firstNode, range.getClientRects(reversed))
      }
    }

    for (const nextNode of iterator) {
      const nextNodeId = this.editor.getNodeId(nextNode)
      if (nextNodeId) {
        range.selectNode(nextNodeId)
        const rects = range.getClientRects(direction === 'backward')
        yield* processNode(nextNode, rects as DOMRect[])
      }
    }
  }
}
