import { useRef } from 'react'
import './App.css'
import { useCaretNavigation } from './hooks/useCaretNavigation'

export default function PositionTest() {
  const contentRef = useRef<HTMLDivElement>(null)
  const navigation = useCaretNavigation(contentRef as React.RefObject<HTMLElement>)

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.metaKey && e.key === 'ArrowLeft') {
      e.preventDefault()
      navigation.modify('move', 'backward', 'lineboundary')
      return
    }

    if (e.metaKey && e.key === 'ArrowRight') {
      e.preventDefault()
      navigation.modify('move', 'forward', 'lineboundary')
      return
    }

    if (e.metaKey && e.key === 'ArrowUp') {
      e.preventDefault()
      navigation.modify('move', 'backward', 'documentboundary')
      return
    }

    if (e.metaKey && e.key === 'ArrowDown') {
      e.preventDefault()
      navigation.modify('move', 'forward', 'documentboundary')
      return
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      navigation.modify('move', 'backward', 'character')
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      navigation.modify('move', 'forward', 'character')
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      navigation.modify('move', 'forward', 'line')
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      navigation.modify('move', 'backward', 'line')
    } else if (e.key === 'Home') {
      e.preventDefault()
      navigation.modify('move', 'backward', 'lineboundary')
    } else if (e.key === 'End') {
      e.preventDefault()
      navigation.modify('move', 'forward', 'lineboundary')
    }
  }

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault()
    const position = document.caretPositionFromPoint(e.clientX, e.clientY)
    if (position) {
      navigation.collapse({ node: position.offsetNode, offset: position.offset })
    }
  }

  return (
    <>
      <textarea onKeyDown={handleKeyDown} autoFocus />

      <div ref={contentRef} style={{ width: '320px' }} onMouseDown={handleMouseDown}>
        <h2>Empty Code Block??</h2>

        <hr />

        <code>{`function helloWorld() {console.log('Hello World')}`}</code>
        <hr />

        <table>
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
              <td>Product</td>
              <td>Category</td>
              <td>Price</td>
              <td>In Stock</td>
            </tr>
          </tbody>
        </table>

        <h2>Empty Code Block??</h2>

        <div>
          test
          <br />
          xxx
          <p>
            Hello <span className="mention purple">test</span>"*선택지가 많을수록 행복도는 떨어진다."* 배리 슈워츠의 **'선택의 역설'**
            연구는 현대 소비사회의 또 다른 클루지를 보여줍니다. 24가지 잼 중에서 고르는 것보다 6가지 중에서 고르는 것이 더 높은 만족도를
            가져온다는 유명한 실험 결과죠. 우리 조상들은 제한된 선택지 속에서 빠른 결정을 내려야 했어요. 하지만 현대인은 수백 개의 TV 채널,
            수만 개의 온라인 상품, 무수한 직업과 라이프스타일 옵션 중에서 '최적의' 선택을 해야 한다는 압박을 받습니다. 이는 두 가지 문제를
            만듭니다. 첫째는 **결정 마비**예요. 너무 많은 옵션이 있으면 아예 결정을 내리지 못하게 됩니다. 온라인 쇼핑에서 몇 시간을 고민하다
            결국 아무것도 사지 않고 나오는 경험이 대표적이죠.
          </p>
          <p>
            World <b>bold</b>sdakfjskfdj <i>italic</i>
          </p>
        </div>

        <p>adlkfajsdk fljdsa klfsjkljdas</p>
      </div>
    </>
  )
}
