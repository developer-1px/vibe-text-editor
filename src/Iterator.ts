// 제네릭 Iterator 연산 클래스
class IteratorOps<T> {
  constructor(private iterator: Generator<T> | Iterable<T>) {}

  // === 필터링 ===
  filter(predicate: (item: T) => boolean): IteratorOps<T> {
    const self = this
    return new IteratorOps(
      (function* () {
        for (const item of self.iterator) {
          if (predicate(item)) yield item
        }
      })(),
    )
  }

  takeWhile(predicate: (item: T) => boolean): IteratorOps<T> {
    const self = this
    return new IteratorOps(
      (function* () {
        for (const item of self.iterator) {
          if (!predicate(item)) break
          yield item
        }
      })(),
    )
  }

  skipWhile(predicate: (item: T) => boolean): IteratorOps<T> {
    const self = this
    return new IteratorOps(
      (function* () {
        let skipping = true
        for (const item of self.iterator) {
          if (skipping && predicate(item)) continue
          skipping = false
          yield item
        }
      })(),
    )
  }

  take(count: number): IteratorOps<T> {
    const self = this
    return new IteratorOps(
      (function* () {
        let taken = 0
        for (const item of self.iterator) {
          if (taken >= count) break
          yield item
          taken++
        }
      })(),
    )
  }

  skip(count: number): IteratorOps<T> {
    const self = this
    return new IteratorOps(
      (function* () {
        let skipped = 0
        for (const item of self.iterator) {
          if (skipped < count) {
            skipped++
            continue
          }
          yield item
        }
      })(),
    )
  }

  // === 변환 ===
  map<U>(selector: (item: T) => U): IteratorOps<U> {
    const self = this
    return new IteratorOps(
      (function* () {
        for (const item of self.iterator) {
          yield selector(item)
        }
      })(),
    )
  }

  flatMap<U>(selector: (item: T) => Iterable<U>): IteratorOps<U> {
    const self = this
    return new IteratorOps(
      (function* () {
        for (const item of self.iterator) {
          yield* selector(item)
        }
      })(),
    )
  }

  // === 부가 작업 ===
  tap(callback: (item: T) => void): IteratorOps<T> {
    const self = this
    return new IteratorOps(
      (function* () {
        for (const item of self.iterator) {
          callback(item)
          yield item
        }
      })(),
    )
  }

  // === 조합 ===
  concat(...others: Iterable<T>[]): IteratorOps<T> {
    const self = this
    return new IteratorOps(
      (function* () {
        yield* self.iterator
        for (const other of others) {
          yield* other
        }
      })(),
    )
  }

  // === 종료 연산 ===
  first(): T | null {
    for (const item of this.iterator) {
      return item
    }
    return null
  }

  last(): T | null {
    let result = null
    for (const item of this.iterator) {
      result = item
    }
    return result
  }

  find(predicate: (item: T) => boolean): T | null {
    for (const item of this.iterator) {
      if (predicate(item)) return item
    }
    return null
  }

  some(predicate: (item: T) => boolean): boolean {
    for (const item of this.iterator) {
      if (predicate(item)) return true
    }
    return false
  }

  every(predicate: (item: T) => boolean): boolean {
    for (const item of this.iterator) {
      if (!predicate(item)) return false
    }
    return true
  }

  count(): number {
    let result = 0
    for (const _ of this.iterator) {
      result++
    }
    return result
  }

  toArray(): T[] {
    return Array.from(this.iterator)
  }

  // === Iterator 인터페이스 ===
  [Symbol.iterator]() {
    return this.iterator[Symbol.iterator]()
  }
}

// 편의를 위한 팩토리 함수
export function iter<T>(iterable: Iterable<T>): IteratorOps<T> {
  return new IteratorOps(iterable)
}
