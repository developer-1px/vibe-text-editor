import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import './App.css'
import { isElementNode, isTextNode } from './lib/nodes'
import { visualizeRects } from './lib/debug'

//
function getDistanceToGoalX(rect: DOMRect, goalX: number): number {
  // goalX가 rect 안에 있으면 거리 0
  if (goalX >= rect.left && goalX <= rect.right) {
    return 0
  }

  // goalX가 rect 왼쪽에 있으면 left edge와의 거리
  if (goalX < rect.left) {
    return rect.left - goalX
  }

  // goalX가 rect 오른쪽에 있으면 right edge와의 거리
  return goalX - rect.right
}

function findClosestRectToGoalX(nodeRects: DOMRect[], goalX: number): DOMRect | null {
  if (!nodeRects || nodeRects.length === 0) return null

  let closestRect = nodeRects[0]
  let minDistance = getDistanceToGoalX(nodeRects[0], goalX)

  for (let i = 1; i < nodeRects.length; i++) {
    const distance = getDistanceToGoalX(nodeRects[i], goalX)
    if (distance < minDistance) {
      minDistance = distance
      closestRect = nodeRects[i]
    }
  }

  return closestRect
}

const getPositionBoundingClientRect = (position: { offsetNode: Node; offset: number } | null): DOMRect | null => {
  if (!position) return null

  if (isElementNode(position.offsetNode)) {
    const target = position.offsetNode.childNodes[position.offset]
    if (!target) return (position.offsetNode as HTMLElement).getBoundingClientRect()

    if (isElementNode(target)) {
      return (target as HTMLElement).getBoundingClientRect()
    }

    return getPositionBoundingClientRect({
      offsetNode: target,
      offset: 0,
    })
  }

  const range = document.createRange()
  range.setStart(position.offsetNode, position.offset)
  return range.getBoundingClientRect()
}

function createWalker(node: Node, offsetNode?: Node) {
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        return NodeFilter.FILTER_ACCEPT
      }

      // if (node instanceof HTMLElement && node.tagName === 'TABLE') {
      //   return NodeFilter.FILTER_REJECT
      // }

      return NodeFilter.FILTER_SKIP
    },
  })

  if (offsetNode) {
    walker.currentNode = offsetNode
  }
  return walker
}

function useSelection(editorRef: React.RefObject<HTMLLabelElement>) {
  const [caretPosition, setCaretPosition] = useState<{ offsetNode: Node; offset: number } | null>(null)
  const [cursorRect, setCursorRect] = useState<DOMRect>(new DOMRect())
  const [goalX, setGoalX] = useState<number | null>(null)

  const [anchorNode, setAnchorNode] = useState<Node | null>(null)
  const [anchorOffset, setAnchorOffset] = useState<number>(0)

  const [focusNode, setFocusNode] = useState<Node | null>(null)
  const [focusOffset, setFocusOffset] = useState<number>(0)

  function moveOffsetX(offset: number) {
    if (!caretPosition || !editorRef.current) return

    const newOffset = caretPosition.offset + offset
    let nextNode: Node | null = null
    let nextOffset = 0

    if (isTextNode(caretPosition.offsetNode)) {
      const textNode = caretPosition.offsetNode as Text
      const textLength = textNode.textContent?.length ?? 0

      console.log('1')

      if (newOffset >= 0 && newOffset <= textLength) {
        console.log('2')

        nextNode = textNode
        nextOffset = newOffset
      } else if (newOffset < 0) {
        console.log('3')

        nextNode = createWalker(editorRef.current, caretPosition.offsetNode).previousNode()
        nextOffset = nextNode?.textContent?.length ?? 0
      } else {
        console.log('4')

        nextNode = createWalker(editorRef.current, caretPosition.offsetNode).nextNode()
        nextOffset = 0
      }
    } else {
      console.log('else!!!!!!!!')
      // nextNode = createWalker(editorRef.current, caretPosition.offsetNode.childNodes[caretPosition.offset].childNodes[0]).nextNode()
      nextNode = caretPosition.offsetNode.childNodes[caretPosition.offset].childNodes[0]
      nextOffset = 0
    }

    // // 현재 노드 내에서 이동 가능한 경우
    // if (newOffset >= 0 && newOffset <= (caretPosition.offsetNode.textContent?.length ?? 0)) {
    //   nextNode = caretPosition.offsetNode
    //   nextOffset = newOffset
    // }
    // // 이전 노드로 이동해야 하는 경우
    // else if (newOffset < 0) {
    //   nextNode = createWalker(editorRef.current, caretPosition.offsetNode).previousNode()
    //   nextOffset = nextNode?.textContent?.length ?? 0
    // }
    // // 다음 노드로 이동해야 하는 경우
    // else {
    // }

    if (nextNode) {
      setCaretPosition({ offsetNode: nextNode, offset: nextOffset })
    }
  }

  function moveOffsetLineBoundary(offset: 1 | -1) {
    if (!caretPosition || !editorRef.current) return

    const range = document.createRange()
    range.setStart(caretPosition.offsetNode, caretPosition.offset)
    const rect1 = range.getBoundingClientRect()
    range.selectNode(caretPosition.offsetNode)
    range.selectNodeContents(range.commonAncestorContainer)
    const rect2 = range.getBoundingClientRect()

    // editor의 좌우 끝에서 y축 중앙에 가장 가까운 캐럿 위치를 찾습니다.
    const targetPosition =
      offset === 1 ? caretPositionFromPoint(rect2.right - 1, rect1.top) : caretPositionFromPoint(rect2.left + 1, rect1.top)

    if (targetPosition) {
      setCaretPosition({
        offsetNode: targetPosition.offsetNode,
        offset: targetPosition.offset,
      })
    }
  }

  function moveOffsetY(offset: 1 | -1) {
    if (!editorRef.current || !caretPosition) return

    const x = goalX ?? cursorRect.left
    setGoalX(x)

    if (offset === 1) {
      const nextLine = getNextLine(editorRef.current, caretPosition.offsetNode, caretPosition.offset, 0.4)
      const closestRect = findClosestRectToGoalX(nextLine?.map((node) => node.rect) ?? [], x)

      if (closestRect) {
        // visualizeRects([closestRect])

        const caretPosition = caretPositionFromPoint(x, closestRect.top)
        if (!caretPosition || !editorRef.current) return

        if (caretPosition) {
          setCaretPosition(caretPosition)
        }
      }
    } else {
      const prevLine = getPrevLine(editorRef.current, caretPosition.offsetNode, caretPosition.offset, 0.4)
      const closestRect = findClosestRectToGoalX(prevLine?.map((node) => node.rect) ?? [], x)

      if (closestRect) {
        // visualizeRects([closestRect])

        const caretPosition = caretPositionFromPoint(x, closestRect.bottom)
        if (!caretPosition || !editorRef.current) return

        if (caretPosition) {
          setCaretPosition(caretPosition)
        }
      }
    }
  }

  function moveOffsetDocumentBoundary(offset: 1 | -1) {
    if (!editorRef.current) return

    const walker = createWalker(editorRef.current)

    if (offset === -1) {
      const firstNode = walker.firstChild()
      if (firstNode) {
        setCaretPosition({
          offsetNode: firstNode,
          offset: 0,
        })
      }
    } else {
      const lastNode = walker.lastChild()
      if (lastNode) {
        setCaretPosition({
          offsetNode: lastNode,
          offset: lastNode.textContent?.length ?? 0,
        })
      }
    }
  }

  function collapse(node: Node, offset: number) {
    setCaretPosition({ offsetNode: node, offset: offset })

    setAnchorNode(node)
    setAnchorOffset(offset)
    setFocusNode(node)
    setFocusOffset(offset)
    setGoalX(null)
  }

  function extend(node: Node, offset: number) {
    if (!anchorNode) {
      setAnchorNode(node)
      setAnchorOffset(offset)
    }
    setFocusNode(node)
    setFocusOffset(offset)
    setGoalX(null)
  }

  function modify(
    alter: 'move' | 'extend',
    direction: 'forward' | 'backward',
    unit: 'character' | 'word' | 'line' | 'lineboundary' | 'documentboundary',
  ) {
    if (unit !== 'line') {
      setGoalX(null)
    }

    if (unit === 'character') {
      if (alter === 'move') {
        return moveOffsetX(direction === 'forward' ? 1 : -1)
      } else {
        return moveOffsetX(direction === 'forward' ? 1 : -1)
      }
    }

    if (unit === 'line') {
      if (alter === 'move') {
        return moveOffsetY(direction === 'forward' ? 1 : -1)
      } else {
        return moveOffsetY(direction === 'forward' ? 1 : -1)
      }
    }

    if (unit === 'lineboundary') {
      if (alter === 'move') {
        return moveOffsetLineBoundary(direction === 'forward' ? 1 : -1)
      } else {
        return moveOffsetLineBoundary(direction === 'forward' ? 1 : -1)
      }
    }

    if (unit === 'documentboundary') {
      if (alter === 'move') {
        return moveOffsetDocumentBoundary(direction === 'forward' ? 1 : -1)
      }
    }
  }

  useEffect(() => {
    console.log('>>> setCaretPosition', caretPosition)

    if (caretPosition) {
      const range = document.createRange()
      range.setStart(caretPosition.offsetNode, caretPosition.offset)
      const rects = range.getClientRects()
      visualizeRects(rects)
    }

    const rect = getPositionBoundingClientRect(caretPosition)
    if (rect) {
      setCursorRect(rect)
    }
  }, [caretPosition])

  // 커서 위치 업데이트
  useEffect(() => {
    if (!anchorNode || !focusNode) return

    const comparison = anchorNode.compareDocumentPosition(focusNode)
    const isAnchorStart = (comparison === 0 && anchorOffset < focusOffset) || comparison & Node.DOCUMENT_POSITION_FOLLOWING

    const startNode = isAnchorStart ? anchorNode : focusNode
    const startOffset = isAnchorStart ? anchorOffset : focusOffset

    const endNode = isAnchorStart ? focusNode : anchorNode
    const endOffset = isAnchorStart ? focusOffset : anchorOffset

    const range = document.createRange()
    range.setStart(startNode, startOffset)
    range.setEnd(endNode, endOffset)
    const rects = range.getClientRects()
    const rect = range.getBoundingClientRect()

    if (rect) {
      const cursor = document.querySelector<HTMLElement>('.custom-cursor')
      const selectionRects = document.querySelector<HTMLElement>('.selection-rect-start')
      const root = editorRef.current?.getBoundingClientRect()

      if (root && cursor && cursorRect) {
        cursor.style.top = `${cursorRect.top - (root.top ?? 0)}px`
        cursor.style.left = `${cursorRect.left - (root.left ?? 0)}px`
        cursor.style.width = `${cursorRect.width}px`
        cursor.style.height = `${cursorRect.height}px`
        cursor.style.display = 'block'

        selectionRects.style.top = `${rect.top - (root.top ?? 0)}px`
        selectionRects.style.left = `${rect.left - (root.left ?? 0)}px`
        selectionRects.style.width = `${rect.width}px`
        selectionRects.style.height = `${rect.height}px`
        selectionRects.style.display = 'block'

        cursor.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [anchorNode, anchorOffset, focusNode, focusOffset, editorRef, cursorRect])

  interface NodeRect {
    node: Node
    rect: DOMRect
  }

  const calculateVerticalOverlap = (rect1: DOMRect, rect2: DOMRect): number => {
    const overlapTop = Math.max(rect1.top, rect2.top)
    const overlapBottom = Math.min(rect1.bottom, rect2.bottom)
    const overlapHeight = Math.max(0, overlapBottom - overlapTop)

    const minHeight = Math.min(rect1.height, rect2.height)
    return minHeight > 0 ? overlapHeight / minHeight : 0
  }

  function* walkValidRects(offsetNode: Node, offset: number, root: Element) {
    // 현재 노드에서 커서 이후 부분
    try {
      const range = document.createRange()
      range.setStart(offsetNode, offset)
      yield { node: offsetNode, rect: range.getBoundingClientRect() }
      range.setEndAfter(offsetNode)
      for (const rect of range.getClientRects()) {
        yield { node: offsetNode, rect }
      }
    } catch (e) {
      // Range 설정 실패시 건너뜀
    }

    // 다음 노드들 순회
    const walker = createWalker(root, offsetNode)
    let node = walker.nextNode()
    while (node) {
      const range = document.createRange()
      range.selectNodeContents(node)
      for (const rect of range.getClientRects()) {
        yield { node, rect }
      }
      node = walker.nextNode()
    }
  }

  function* walkValidRectsBackward(offsetNode: Node, offset: number, root: Element) {
    // 현재 노드에서 커서 이전 부분
    try {
      const range = document.createRange()
      range.setStart(offsetNode, offset)
      range.setEnd(offsetNode, offset)
      yield { node: offsetNode, rect: range.getBoundingClientRect() }
      range.setStart(offsetNode, 0)
      const rects = Array.from(range.getClientRects()).reverse()
      for (const rect of rects) {
        yield { node: offsetNode, rect }
      }
    } catch (e) {
      // Range 설정 실패시 건너뜀
    }

    // 이전 노드들 순회
    const walker = createWalker(root, offsetNode)
    let node = walker.previousNode()
    while (node) {
      const range = document.createRange()
      range.selectNodeContents(node)
      const rects = Array.from(range.getClientRects()).reverse()
      for (const rect of rects) {
        yield { node, rect }
      }
      node = walker.previousNode()
    }
  }

  function getNextLine(root: Element, offsetNode: Node, offset: number, overlapThreshold: number = 0.5): NodeRect[] | null {
    let currentLineRect: DOMRect | null = null
    let nextLineRect: DOMRect | null = null
    let nextLineNodes: NodeRect[] = []

    for (const { node, rect } of walkValidRects(offsetNode, offset, root)) {
      if (!currentLineRect) {
        currentLineRect = rect
      } else if (!nextLineRect) {
        if (calculateVerticalOverlap(currentLineRect, rect) < overlapThreshold) {
          nextLineRect = rect
          nextLineNodes.push({ node, rect })
        }
      } else {
        if (calculateVerticalOverlap(nextLineRect, rect) >= overlapThreshold) {
          nextLineNodes.push({ node, rect })
        } else {
          break
        }
      }
    }

    return nextLineNodes.length > 0 ? nextLineNodes : null
  }

  function getPrevLine(root: Element, offsetNode: Node, offset: number, overlapThreshold: number = 0.4): NodeRect[] | null {
    let currentLineRect: DOMRect | null = null
    let prevLineRect: DOMRect | null = null
    let prevLineNodes: NodeRect[] = []

    for (const { node, rect } of walkValidRectsBackward(offsetNode, offset, root)) {
      if (!currentLineRect) {
        currentLineRect = rect
      } else if (!prevLineRect) {
        console.log('calculateVerticalOverlap(currentLineRect, rect)', calculateVerticalOverlap(currentLineRect, rect))
        if (calculateVerticalOverlap(currentLineRect, rect) < overlapThreshold) {
          prevLineRect = rect
          prevLineNodes.unshift({ node, rect })
        }
      } else {
        if (calculateVerticalOverlap(prevLineRect, rect) >= overlapThreshold) {
          prevLineNodes.unshift({ node, rect })
        } else {
          break
        }
      }
    }

    return prevLineNodes.length > 0 ? prevLineNodes : null
  }

  function debug() {
    if (!caretPosition) return

    const nextLine = getPrevLine(editorRef.current, caretPosition.offsetNode, caretPosition.offset, 0.4)
    console.log(nextLine)

    if (nextLine) {
      for (const node of nextLine) {
        visualizeRects([node.rect])
      }
    }
  }

  return new (class {
    caretPosition = caretPosition
    setCaretPosition = setCaretPosition
    cursorRect = cursorRect
    goalX = goalX
    setGoalX = setGoalX
    debug = debug

    // public methods
    collapse = collapse
    extend = extend
    modify = modify
  })()
}

// @TODO: 스크롤 위치 보정 기능 구현 필요!!
function caretPositionFromPoint(x: number, y: number) {
  const caretPosition = document.caretPositionFromPoint(x, y)
  if (!caretPosition) {
    return null
  }

  return {
    offsetNode: caretPosition?.offsetNode,
    offset: caretPosition?.offset,
    isEnd: false,
  }
}

export default function CurosrTest() {
  const editorRef = useRef<HTMLLabelElement>(null)

  const selection = useSelection(editorRef as React.RefObject<HTMLLabelElement>)

  function handleMouseDown(e: MouseEvent<HTMLLabelElement>) {
    e.preventDefault()
    const caretPosition = caretPositionFromPoint(e.clientX, e.clientY)
    if (!caretPosition || !editorRef.current) return

    if (e.shiftKey) {
      selection.extend(caretPosition.offsetNode, caretPosition.offset)
    } else {
      selection.collapse(caretPosition.offsetNode, caretPosition.offset)
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    console.log('e', e.key)

    if (e.metaKey && e.key === 'ArrowLeft') {
      e.preventDefault()
      selection.modify('move', 'backward', 'lineboundary')
      return
    }

    if (e.metaKey && e.key === 'ArrowRight') {
      e.preventDefault()
      selection.modify('move', 'forward', 'lineboundary')
      return
    }

    if (e.metaKey && e.key === 'ArrowUp') {
      e.preventDefault()
      selection.modify('move', 'backward', 'documentboundary')
      return
    }

    if (e.metaKey && e.key === 'ArrowDown') {
      e.preventDefault()
      selection.modify('move', 'forward', 'documentboundary')
      return
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      selection.modify('move', 'backward', 'character')
      return
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault()
      selection.modify('move', 'forward', 'character')
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      selection.modify('move', 'backward', 'line')
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      selection.modify('move', 'forward', 'line')
      return
    }

    if (e.key === '`') {
      e.preventDefault()
      selection.debug()
      return
    }
  }

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const html = `
        <h2>Welcome to the Demo</h2>
        <p>
          This is a demonstration of a custom cursor implementation. It uses a <b>non-contenteditable</b> div. You can click anywhere on
          this text.
        </p>
        <blockquote>
          The cursor you see is a simple <code>&lt;div&gt;</code> element, positioned absolutely based on calculations using{' '}
          <i>\`document.caretPositionFromPoint\`</i>.
        </blockquote>
        <ul>
          <li>List item one. Try navigating from here.</li>
          <li>
            Another list item, with some <code>inline code</code>.
          </li>
          <li>Final item in this list. Notice how the cursor height adapts to the line height.</li>
        </ul>
        <hr />
        <h2>Empty Code Block??</h2>
        <pre>
          <code></code>
        </pre>
        <p>
          The goal is to provide a solid foundation for building a markdown editor where the view is a direct reflection of the model,The
          goal is to provide a solid foundation for building a markdown editor where the view is a direct reflection of the model,
          withoutThe goal is to provide a solid foundation for building a markdown editor where the view is a direct reflection of the The
          goal is to provide a solid foundation for building a markdown editor where the view is a direct reflection of the model,The goal
          is to provide a solid foundation for building a markdown editor where the view is a direct reflection of the model, model, the
          quirks of <code>contenteditable</code>.
        </p>
        <pre>
          <code>
            function helloWorld() {
  console.log("Hello, developer!");
}
          </code>
        </pre>
        <p>
          You can move the cursor with <b>Arrow Keys</b>. The up and down arrow keys try to maintain the horizontal position (Goal-X).
          Thanks to{' '}
          <span className="atomic-component mention blue">
            @me{' '}
            <span className="atomic-component mention blue">
              @too asdklfjaskldfj klasdj flkj asdlkfjasdlkfjadsklfjdlksaj fdlksaj dklsaj adfkl
            </span>
          </span>
          <span className="atomic-component mention blue">@john_doe</span> for the feedback on cursor navigation!
        </p>
        <hr className="atomic-component" />
        <h3>Advanced Content</h3>
        <p>
          This section includes more sss structures like tables and layouts. Shout out to{' '}
          <span className="atomic-component mention purple">@alice_dev</span> and{' '}
          <span className="atomic-component mention green">@bob_designer</span> for their contributions!
        </p>
        <table className="atomic-component">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>In Stock</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Laptop Pro</td>
              <td>Electronics</td>
              <td>$1499.99</td>
              <td>
                <b>Yes</b>
              </td>
            </tr>
            <tr>
              <td>Coffee Mug</td>
              <td>Kitchenware</td>
              <td>$12.50</td>
              <td>Yes</td>
            </tr>
            <tr>
              <td>Running Shoes</td>
              <td>Apparel</td>
              <td>$89.90</td>
              <td>
                <i>No</i>
              </td>
            </tr>
          </tbody>
        </table>
        <table className="atomic-component">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>In Stock</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Laptop Pro</td>
              <td></td>
              <td>$1499.99</td>
              <td>
                <b>Yes</b>
              </td>
            </tr>
            <tr>
              <td>Coffee Mug</td>
              <td>Kitchenware</td>
              <td>$12.50</td>
              <td>Yes</td>
            </tr>
            <tr>
              <td>Running Shoes</td>
              <td>Apparel</td>
              <td>$89.90</td>
              <td>
                <i>No</i>
              </td>
            </tr>
          </tbody>
        </table>
        <p>adlkfajsdk fljdsa klfsjkljdas</p>
        <p>adlkfajsdk fljdsa klfsjkljdas</p>
        <section style={{ display: 'flex', gap: '20px', marginTop: '20px', border: '1px solid #ccc' }}>
          <div style={{ flex: 1, border: '1px solid #ccc', padding: '10px' }}>
            <h4>Column One</h4>
            <p>This is the first column of a two-column layout. You should be able to navigate within this text block seamlessly.</p>
          </div>
          <div style={{ flex: 1, border: '1px solid #ccc', padding: '10px', backgroundColor: 'yellow' }}>
            <h4>Column Two</h4>
            <p>And this is the second column. Try moving the cursor between the columns using the up and down arrow keys.</p>
          </div>
          <div style={{ flex: 1, border: '1px solid #ccc', padding: '10px', backgroundColor: 'yellow' }}>
            <h4>Column Two</h4>
            <p>And this is the second column. Try moving the cursor between the columns using the up and down arrow keys.</p>
          </div>
        </section>
        <p>adlkfajsdk fljdsa klfsjkljdas</p>
        <p>adlkfajsdk fljdsa klfsjkljdas</p>    
    `

    if (contentRef.current) {
      contentRef.current.innerHTML = html
    }
  }, [])

  useEffect(() => {
    const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)

    let node = walker.firstChild()
    while (node) {
      node = walker.nextNode()
      console.log(node)
    }
  }, [])

  return (
    <div className="container">
      <label className="editor" onMouseDown={handleMouseDown} style={{ cursor: 'crosshair' }} ref={editorRef}>
        <textarea
          ref={textareaRef}
          autoFocus
          aria-hidden={true}
          style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
          onKeyDown={handleKeyDown}
        />

        <div ref={contentRef}></div>

        <div className="custom-cursor" style={{ display: 'block', outline: '1px solid red' }} />
        <div className="cursor-scroll" />
        <div className="selection-rect selection-rect-start" />
        <div className="selection-rect selection-rect-middle" />
        <div className="selection-rect selection-rect-end" />
      </label>
    </div>
  )
}
