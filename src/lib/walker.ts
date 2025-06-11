/**
 * atomic component 감지 함수
 */
function isAtomicComponent(node: Node): boolean {
  return node.nodeType === Node.ELEMENT_NODE && 
         (node as HTMLElement).classList.contains('atomic-component');
}

/**
 * 상위 atomic component를 찾는 함수
 */
function findParentAtomicComponent(element: Element): HTMLElement | null {
  return element.closest('.atomic-component') as HTMLElement | null;
}

/**
 * '컴포넌트 원자'를 인식하는 커스텀 필터 함수.
 * @param node - 현재 순회 중인 노드
 * @returns 필터링 결과를 나타내는 상수
 */
function richNodeFilter(node: Node): number {
  // 0. 최우선 규칙: 'atomic-component'의 자손 노드는 무조건 건너뛴다.
  // 이 규칙이 'atomic-component' 자체를 수락하는 규칙보다 먼저 와야 효과가 있다.
  if (node.parentElement && findParentAtomicComponent(node.parentElement)) {
      return NodeFilter.FILTER_SKIP;
  }
  
  // 1. 'atomic-component' 클래스를 가진 요소는 하나의 단위로 받아들인다.
  if (isAtomicComponent(node)) {
    return NodeFilter.FILTER_ACCEPT;
  }

  // 2. 내용이 있는 텍스트 노드는 받아들인다.
  if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim().length) {
     return NodeFilter.FILTER_ACCEPT;
  }
  
  // 3. 그 외의 모든 컨테이너 노드(p, div 등)는 건너뛰고, 그 자식들을 계속 탐색한다.
  return NodeFilter.FILTER_SKIP;
}


/**
 * 텍스트 노드와 '컴포넌트 원자'를 순회하는 TreeWalker를 생성한다.
 * @param root - 탐색을 시작할 최상위 노드
 * @returns 설정된 TreeWalker 인스턴스
 */
export const createRichNodeWalker = (root: Node): TreeWalker => {
  // 텍스트 노드와 엘리먼트 노드를 모두 필터 대상으로 삼는다.
  return document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: richNodeFilter
  });
}; 