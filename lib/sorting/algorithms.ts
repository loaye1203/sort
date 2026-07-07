import { algorithmRegistry } from "./registry";
import type { SortAlgorithm, SortOptions, SortStep } from "./types";

function clone(input: number[]) {
  return [...input];
}

function isSorted(values: number[]) {
  for (let index = 1; index < values.length; index += 1) {
    if (values[index - 1] > values[index]) {
      return false;
    }
  }

  return true;
}

function shuffle(values: number[]) {
  const next = [...values];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [next[index], next[target]] = [next[target], next[index]];
  }

  return next;
}

function done(array: number[]): SortStep {
  return { type: "done", array: clone(array) };
}

function metaFor(id: string) {
  const entry = algorithmRegistry.find((item) => item.meta.id === id);

  if (!entry) {
    throw new Error(`Unknown algorithm meta: ${id}`);
  }

  return entry.meta;
}

function* bubbleSort(input: number[]): Generator<SortStep> {
  const array = clone(input);

  for (let end = array.length - 1; end > 0; end -= 1) {
    let swapped = false;

    for (let index = 0; index < end; index += 1) {
      yield { type: "compare", indices: [index, index + 1] };

      if (array[index] > array[index + 1]) {
        [array[index], array[index + 1]] = [array[index + 1], array[index]];
        swapped = true;
        yield { type: "swap", indices: [index, index + 1], array: clone(array) };
      }
    }

    yield { type: "mark", indices: [end], role: "sorted" };

    if (!swapped) {
      break;
    }
  }

  yield done(array);
}

function* selectionSort(input: number[]): Generator<SortStep> {
  const array = clone(input);

  for (let start = 0; start < array.length - 1; start += 1) {
    let minimum = start;
    yield { type: "mark", indices: [minimum], role: "candidate" };

    for (let index = start + 1; index < array.length; index += 1) {
      yield { type: "compare", indices: [minimum, index] };

      if (array[index] < array[minimum]) {
        minimum = index;
        yield { type: "mark", indices: [minimum], role: "candidate" };
      }
    }

    if (minimum !== start) {
      [array[start], array[minimum]] = [array[minimum], array[start]];
      yield { type: "swap", indices: [start, minimum], array: clone(array) };
    }

    yield { type: "mark", indices: [start], role: "sorted" };
  }

  yield done(array);
}

function* insertionSort(input: number[]): Generator<SortStep> {
  const array = clone(input);

  for (let index = 1; index < array.length; index += 1) {
    const value = array[index];
    let cursor = index - 1;
    yield { type: "mark", indices: [index], role: "candidate" };

    while (cursor >= 0) {
      yield { type: "compare", indices: [cursor, cursor + 1] };

      if (array[cursor] <= value) {
        break;
      }

      array[cursor + 1] = array[cursor];
      yield { type: "write", index: cursor + 1, value: array[cursor + 1], array: clone(array) };
      cursor -= 1;
    }

    array[cursor + 1] = value;
    yield { type: "write", index: cursor + 1, value, array: clone(array) };
  }

  yield done(array);
}

function* mergeSort(input: number[]): Generator<SortStep> {
  const array = clone(input);

  function* merge(left: number, middle: number, right: number): Generator<SortStep> {
    const leftPart = array.slice(left, middle + 1);
    const rightPart = array.slice(middle + 1, right + 1);
    let leftIndex = 0;
    let rightIndex = 0;
    let writeIndex = left;

    while (leftIndex < leftPart.length && rightIndex < rightPart.length) {
      yield { type: "compare", indices: [left + leftIndex, middle + 1 + rightIndex] };

      if (leftPart[leftIndex] <= rightPart[rightIndex]) {
        array[writeIndex] = leftPart[leftIndex];
        leftIndex += 1;
      } else {
        array[writeIndex] = rightPart[rightIndex];
        rightIndex += 1;
      }

      yield { type: "write", index: writeIndex, value: array[writeIndex], array: clone(array) };
      writeIndex += 1;
    }

    while (leftIndex < leftPart.length) {
      array[writeIndex] = leftPart[leftIndex];
      yield { type: "write", index: writeIndex, value: array[writeIndex], array: clone(array) };
      leftIndex += 1;
      writeIndex += 1;
    }

    while (rightIndex < rightPart.length) {
      array[writeIndex] = rightPart[rightIndex];
      yield { type: "write", index: writeIndex, value: array[writeIndex], array: clone(array) };
      rightIndex += 1;
      writeIndex += 1;
    }
  }

  function* split(left: number, right: number): Generator<SortStep> {
    if (left >= right) {
      return;
    }

    const middle = Math.floor((left + right) / 2);
    yield* split(left, middle);
    yield* split(middle + 1, right);
    yield* merge(left, middle, right);
  }

  yield* split(0, array.length - 1);
  yield done(array);
}

function* quickSort(input: number[]): Generator<SortStep> {
  const array = clone(input);

  function* partition(low: number, high: number): Generator<SortStep, number> {
    const pivot = array[high];
    let cursor = low;
    yield { type: "mark", indices: [high], role: "pivot" };

    for (let index = low; index < high; index += 1) {
      yield { type: "compare", indices: [index, high] };

      if (array[index] <= pivot) {
        if (cursor !== index) {
          [array[cursor], array[index]] = [array[index], array[cursor]];
          yield { type: "swap", indices: [cursor, index], array: clone(array) };
        }

        cursor += 1;
      }
    }

    [array[cursor], array[high]] = [array[high], array[cursor]];
    yield { type: "swap", indices: [cursor, high], array: clone(array) };

    return cursor;
  }

  function* sort(low: number, high: number): Generator<SortStep> {
    if (low >= high) {
      return;
    }

    const pivotIndex = yield* partition(low, high);
    yield* sort(low, pivotIndex - 1);
    yield* sort(pivotIndex + 1, high);
  }

  yield* sort(0, array.length - 1);
  yield done(array);
}

function* heapSort(input: number[]): Generator<SortStep> {
  const array = clone(input);

  function* heapify(size: number, root: number): Generator<SortStep> {
    let largest = root;
    const left = root * 2 + 1;
    const right = root * 2 + 2;

    if (left < size) {
      yield { type: "compare", indices: [largest, left] };
      if (array[left] > array[largest]) {
        largest = left;
      }
    }

    if (right < size) {
      yield { type: "compare", indices: [largest, right] };
      if (array[right] > array[largest]) {
        largest = right;
      }
    }

    if (largest !== root) {
      [array[root], array[largest]] = [array[largest], array[root]];
      yield { type: "swap", indices: [root, largest], array: clone(array) };
      yield* heapify(size, largest);
    }
  }

  for (let index = Math.floor(array.length / 2) - 1; index >= 0; index -= 1) {
    yield* heapify(array.length, index);
  }

  for (let end = array.length - 1; end > 0; end -= 1) {
    [array[0], array[end]] = [array[end], array[0]];
    yield { type: "swap", indices: [0, end], array: clone(array) };
    yield { type: "mark", indices: [end], role: "sorted" };
    yield* heapify(end, 0);
  }

  yield done(array);
}

function* countingSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  const maximum = Math.max(...array);
  const counts = Array.from({ length: maximum + 1 }, () => 0);

  for (let index = 0; index < array.length; index += 1) {
    counts[array[index]] += 1;
    yield { type: "mark", indices: [index], role: "candidate" };
  }

  let writeIndex = 0;

  for (let value = 0; value < counts.length; value += 1) {
    while (counts[value] > 0) {
      array[writeIndex] = value;
      yield { type: "write", index: writeIndex, value, array: clone(array) };
      counts[value] -= 1;
      writeIndex += 1;
    }
  }

  yield done(array);
}

function* radixSortLsd(input: number[]): Generator<SortStep> {
  const array = clone(input);
  const maximum = Math.max(...array, 0);

  for (let place = 1; Math.floor(maximum / place) > 0; place *= 10) {
    const buckets: number[][] = Array.from({ length: 10 }, () => []);

    for (let index = 0; index < array.length; index += 1) {
      const digit = Math.floor(array[index] / place) % 10;
      buckets[digit].push(array[index]);
      yield { type: "mark", indices: [index], role: "candidate" };
    }

    let writeIndex = 0;

    for (const bucket of buckets) {
      for (const value of bucket) {
        array[writeIndex] = value;
        yield { type: "write", index: writeIndex, value, array: clone(array) };
        writeIndex += 1;
      }
    }
  }

  yield done(array);
}

function* bucketSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  const maximum = Math.max(...array, 1);
  const bucketCount = Math.max(2, Math.ceil(Math.sqrt(array.length)));
  const buckets: number[][] = Array.from({ length: bucketCount }, () => []);

  for (let index = 0; index < array.length; index += 1) {
    const bucketIndex = Math.min(bucketCount - 1, Math.floor((array[index] / (maximum + 1)) * bucketCount));
    buckets[bucketIndex].push(array[index]);
    yield { type: "mark", indices: [index], role: "candidate" };
  }

  let writeIndex = 0;

  for (const bucket of buckets) {
    bucket.sort((left, right) => left - right);

    for (const value of bucket) {
      array[writeIndex] = value;
      yield { type: "write", index: writeIndex, value, array: clone(array) };
      writeIndex += 1;
    }
  }

  yield done(array);
}

function* shellSort(input: number[]): Generator<SortStep> {
  const array = clone(input);

  for (let gap = Math.floor(array.length / 2); gap > 0; gap = Math.floor(gap / 2)) {
    yield { type: "message", text: `当前 gap = ${gap}。` };

    for (let index = gap; index < array.length; index += 1) {
      const value = array[index];
      let cursor = index;
      yield { type: "mark", indices: [index], role: "candidate" };

      while (cursor >= gap) {
        yield { type: "compare", indices: [cursor - gap, cursor] };

        if (array[cursor - gap] <= value) {
          break;
        }

        array[cursor] = array[cursor - gap];
        yield { type: "write", index: cursor, value: array[cursor], array: clone(array) };
        cursor -= gap;
      }

      array[cursor] = value;
      yield { type: "write", index: cursor, value, array: clone(array) };
    }
  }

  yield done(array);
}

function* combSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  let gap = array.length;
  let swapped = true;

  while (gap > 1 || swapped) {
    gap = Math.max(1, Math.floor(gap / 1.3));
    swapped = false;
    yield { type: "message", text: `梳排序 gap = ${gap}。` };

    for (let index = 0; index + gap < array.length; index += 1) {
      yield { type: "compare", indices: [index, index + gap] };

      if (array[index] > array[index + gap]) {
        [array[index], array[index + gap]] = [array[index + gap], array[index]];
        swapped = true;
        yield { type: "swap", indices: [index, index + gap], array: clone(array) };
      }
    }
  }

  yield done(array);
}

function* cocktailShakerSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  let start = 0;
  let end = array.length - 1;
  let swapped = true;

  while (swapped) {
    swapped = false;

    for (let index = start; index < end; index += 1) {
      yield { type: "compare", indices: [index, index + 1] };

      if (array[index] > array[index + 1]) {
        [array[index], array[index + 1]] = [array[index + 1], array[index]];
        swapped = true;
        yield { type: "swap", indices: [index, index + 1], array: clone(array) };
      }
    }

    yield { type: "mark", indices: [end], role: "sorted" };

    if (!swapped) {
      break;
    }

    swapped = false;
    end -= 1;

    for (let index = end; index > start; index -= 1) {
      yield { type: "compare", indices: [index - 1, index] };

      if (array[index - 1] > array[index]) {
        [array[index - 1], array[index]] = [array[index], array[index - 1]];
        swapped = true;
        yield { type: "swap", indices: [index - 1, index], array: clone(array) };
      }
    }

    yield { type: "mark", indices: [start], role: "sorted" };
    start += 1;
  }

  yield done(array);
}

function* oddEvenSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  let sorted = false;

  while (!sorted) {
    sorted = true;

    for (let index = 1; index < array.length - 1; index += 2) {
      yield { type: "compare", indices: [index, index + 1] };

      if (array[index] > array[index + 1]) {
        [array[index], array[index + 1]] = [array[index + 1], array[index]];
        sorted = false;
        yield { type: "swap", indices: [index, index + 1], array: clone(array) };
      }
    }

    for (let index = 0; index < array.length - 1; index += 2) {
      yield { type: "compare", indices: [index, index + 1] };

      if (array[index] > array[index + 1]) {
        [array[index], array[index + 1]] = [array[index + 1], array[index]];
        sorted = false;
        yield { type: "swap", indices: [index, index + 1], array: clone(array) };
      }
    }
  }

  yield done(array);
}

function* gnomeSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  let index = 0;

  while (index < array.length) {
    if (index === 0) {
      index += 1;
      continue;
    }

    yield { type: "compare", indices: [index - 1, index] };

    if (array[index - 1] <= array[index]) {
      index += 1;
    } else {
      [array[index - 1], array[index]] = [array[index], array[index - 1]];
      yield { type: "swap", indices: [index - 1, index], array: clone(array) };
      index -= 1;
    }
  }

  yield done(array);
}

function* pancakeSort(input: number[]): Generator<SortStep> {
  const array = clone(input);

  function* flip(end: number): Generator<SortStep> {
    let left = 0;
    let right = end;

    while (left < right) {
      [array[left], array[right]] = [array[right], array[left]];
      yield { type: "swap", indices: [left, right], array: clone(array) };
      left += 1;
      right -= 1;
    }
  }

  for (let size = array.length; size > 1; size -= 1) {
    let maximumIndex = 0;

    for (let index = 1; index < size; index += 1) {
      yield { type: "compare", indices: [maximumIndex, index] };

      if (array[index] > array[maximumIndex]) {
        maximumIndex = index;
        yield { type: "mark", indices: [maximumIndex], role: "candidate" };
      }
    }

    if (maximumIndex !== size - 1) {
      if (maximumIndex > 0) {
        yield* flip(maximumIndex);
      }

      yield* flip(size - 1);
    }

    yield { type: "mark", indices: [size - 1], role: "sorted" };
  }

  yield done(array);
}

function* cycleSort(input: number[]): Generator<SortStep> {
  const array = clone(input);

  for (let cycleStart = 0; cycleStart < array.length - 1; cycleStart += 1) {
    let item = array[cycleStart];
    let position = cycleStart;

    for (let index = cycleStart + 1; index < array.length; index += 1) {
      yield { type: "compare", indices: [cycleStart, index] };

      if (array[index] < item) {
        position += 1;
      }
    }

    if (position === cycleStart) {
      continue;
    }

    while (item === array[position]) {
      position += 1;
    }

    [array[position], item] = [item, array[position]];
    yield { type: "write", index: position, value: array[position], array: clone(array) };

    while (position !== cycleStart) {
      position = cycleStart;

      for (let index = cycleStart + 1; index < array.length; index += 1) {
        yield { type: "compare", indices: [cycleStart, index] };

        if (array[index] < item) {
          position += 1;
        }
      }

      while (item === array[position]) {
        position += 1;
      }

      [array[position], item] = [item, array[position]];
      yield { type: "write", index: position, value: array[position], array: clone(array) };
    }
  }

  yield done(array);
}

function* patienceSort(input: number[]): Generator<SortStep> {
  const piles: number[][] = [];
  const output: number[] = [];

  for (let index = 0; index < input.length; index += 1) {
    const value = input[index];
    let pileIndex = 0;

    while (pileIndex < piles.length) {
      yield { type: "compare", indices: [index, pileIndex] };

      if (value <= piles[pileIndex][piles[pileIndex].length - 1]) {
        break;
      }

      pileIndex += 1;
    }

    if (!piles[pileIndex]) {
      piles[pileIndex] = [];
    }

    piles[pileIndex].push(value);
    yield { type: "mark", indices: [index], role: "candidate" };
  }

  while (piles.some((pile) => pile.length > 0)) {
    let minimumPile = -1;

    for (let pileIndex = 0; pileIndex < piles.length; pileIndex += 1) {
      if (piles[pileIndex].length === 0) {
        continue;
      }

      if (
        minimumPile === -1 ||
        piles[pileIndex][piles[pileIndex].length - 1] < piles[minimumPile][piles[minimumPile].length - 1]
      ) {
        minimumPile = pileIndex;
      }
    }

    const value = piles[minimumPile].pop();

    if (value !== undefined) {
      output.push(value);
      yield { type: "write", index: output.length - 1, value, array: clone(output) };
    }
  }

  yield done(output);
}

function* binaryInsertionSort(input: number[]): Generator<SortStep> {
  const array = clone(input);

  for (let index = 1; index < array.length; index += 1) {
    const value = array[index];
    let left = 0;
    let right = index;

    while (left < right) {
      const middle = Math.floor((left + right) / 2);
      yield { type: "compare", indices: [middle, index] };

      if (array[middle] <= value) {
        left = middle + 1;
      } else {
        right = middle;
      }
    }

    for (let cursor = index; cursor > left; cursor -= 1) {
      array[cursor] = array[cursor - 1];
      yield { type: "write", index: cursor, value: array[cursor], array: clone(array) };
    }

    array[left] = value;
    yield { type: "write", index: left, value, array: clone(array) };
  }

  yield done(array);
}

function* bottomUpMergeSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  const buffer = clone(input);

  function* merge(left: number, middle: number, right: number): Generator<SortStep> {
    for (let index = left; index <= right; index += 1) {
      buffer[index] = array[index];
    }

    let leftIndex = left;
    let rightIndex = middle + 1;

    for (let writeIndex = left; writeIndex <= right; writeIndex += 1) {
      if (leftIndex > middle) {
        array[writeIndex] = buffer[rightIndex];
        rightIndex += 1;
      } else if (rightIndex > right) {
        array[writeIndex] = buffer[leftIndex];
        leftIndex += 1;
      } else {
        yield { type: "compare", indices: [leftIndex, rightIndex] };

        if (buffer[leftIndex] <= buffer[rightIndex]) {
          array[writeIndex] = buffer[leftIndex];
          leftIndex += 1;
        } else {
          array[writeIndex] = buffer[rightIndex];
          rightIndex += 1;
        }
      }

      yield { type: "write", index: writeIndex, value: array[writeIndex], array: clone(array) };
    }
  }

  for (let width = 1; width < array.length; width *= 2) {
    yield { type: "message", text: `自底向上归并：当前块宽 ${width}。` };

    for (let left = 0; left < array.length - width; left += width * 2) {
      const middle = left + width - 1;
      const right = Math.min(left + width * 2 - 1, array.length - 1);
      yield* merge(left, middle, right);
    }
  }

  yield done(array);
}

function* naturalMergeSort(input: number[]): Generator<SortStep> {
  const array = clone(input);

  function* mergeRun(left: number, middle: number, right: number): Generator<SortStep> {
    const leftPart = array.slice(left, middle + 1);
    const rightPart = array.slice(middle + 1, right + 1);
    let leftIndex = 0;
    let rightIndex = 0;
    let writeIndex = left;

    while (leftIndex < leftPart.length && rightIndex < rightPart.length) {
      yield { type: "compare", indices: [left + leftIndex, middle + 1 + rightIndex] };

      if (leftPart[leftIndex] <= rightPart[rightIndex]) {
        array[writeIndex] = leftPart[leftIndex];
        leftIndex += 1;
      } else {
        array[writeIndex] = rightPart[rightIndex];
        rightIndex += 1;
      }

      yield { type: "write", index: writeIndex, value: array[writeIndex], array: clone(array) };
      writeIndex += 1;
    }

    while (leftIndex < leftPart.length) {
      array[writeIndex] = leftPart[leftIndex];
      yield { type: "write", index: writeIndex, value: array[writeIndex], array: clone(array) };
      leftIndex += 1;
      writeIndex += 1;
    }

    while (rightIndex < rightPart.length) {
      array[writeIndex] = rightPart[rightIndex];
      yield { type: "write", index: writeIndex, value: array[writeIndex], array: clone(array) };
      rightIndex += 1;
      writeIndex += 1;
    }
  }

  while (!isSorted(array)) {
    const runs: Array<[number, number]> = [];
    let start = 0;

    while (start < array.length) {
      let end = start;

      while (end + 1 < array.length && array[end] <= array[end + 1]) {
        end += 1;
      }

      runs.push([start, end]);
      start = end + 1;
    }

    yield { type: "message", text: `识别到 ${runs.length} 段天然有序 run。` };

    if (runs.length <= 1) {
      break;
    }

    for (let index = 0; index < runs.length - 1; index += 2) {
      yield* mergeRun(runs[index][0], runs[index][1], runs[index + 1][1]);
    }
  }

  yield done(array);
}

function* threeWayQuickSort(input: number[]): Generator<SortStep> {
  const array = clone(input);

  function* sort(low: number, high: number): Generator<SortStep> {
    if (low >= high) {
      return;
    }

    const pivot = array[low];
    let less = low;
    let index = low + 1;
    let greater = high;
    yield { type: "mark", indices: [low], role: "pivot" };

    while (index <= greater) {
      yield { type: "compare", indices: [index, less] };

      if (array[index] < pivot) {
        [array[less], array[index]] = [array[index], array[less]];
        yield { type: "swap", indices: [less, index], array: clone(array) };
        less += 1;
        index += 1;
      } else if (array[index] > pivot) {
        [array[index], array[greater]] = [array[greater], array[index]];
        yield { type: "swap", indices: [index, greater], array: clone(array) };
        greater -= 1;
      } else {
        index += 1;
      }
    }

    yield* sort(low, less - 1);
    yield* sort(greater + 1, high);
  }

  yield* sort(0, array.length - 1);
  yield done(array);
}

function* dualPivotQuickSort(input: number[]): Generator<SortStep> {
  const array = clone(input);

  function* sort(low: number, high: number): Generator<SortStep> {
    if (low >= high) {
      return;
    }

    yield { type: "compare", indices: [low, high] };

    if (array[low] > array[high]) {
      [array[low], array[high]] = [array[high], array[low]];
      yield { type: "swap", indices: [low, high], array: clone(array) };
    }

    const leftPivot = array[low];
    const rightPivot = array[high];
    let left = low + 1;
    let scan = low + 1;
    let right = high - 1;
    yield { type: "mark", indices: [low, high], role: "pivot" };

    while (scan <= right) {
      yield { type: "compare", indices: [scan, low] };

      if (array[scan] < leftPivot) {
        [array[scan], array[left]] = [array[left], array[scan]];
        yield { type: "swap", indices: [scan, left], array: clone(array) };
        left += 1;
      } else {
        yield { type: "compare", indices: [scan, high] };

        if (array[scan] > rightPivot) {
          while (array[right] > rightPivot && scan < right) {
            yield { type: "compare", indices: [right, high] };
            right -= 1;
          }

          [array[scan], array[right]] = [array[right], array[scan]];
          yield { type: "swap", indices: [scan, right], array: clone(array) };
          right -= 1;

          if (array[scan] < leftPivot) {
            [array[scan], array[left]] = [array[left], array[scan]];
            yield { type: "swap", indices: [scan, left], array: clone(array) };
            left += 1;
          }
        }
      }

      scan += 1;
    }

    left -= 1;
    right += 1;
    [array[low], array[left]] = [array[left], array[low]];
    [array[high], array[right]] = [array[right], array[high]];
    yield { type: "swap", indices: [low, left], array: clone(array) };
    yield { type: "swap", indices: [high, right], array: clone(array) };

    yield* sort(low, left - 1);
    yield* sort(left + 1, right - 1);
    yield* sort(right + 1, high);
  }

  yield* sort(0, array.length - 1);
  yield done(array);
}

function* introSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  const maxDepth = Math.max(1, Math.floor(Math.log2(Math.max(2, array.length))) * 2);

  function* sort(low: number, high: number, depth: number): Generator<SortStep> {
    if (low >= high) {
      return;
    }

    if (depth === 0) {
      yield { type: "message", text: "递归深度触顶，切换到堆排序兜底。" };
      const sorted = array.slice(low, high + 1).sort((left, right) => left - right);

      for (let index = 0; index < sorted.length; index += 1) {
        array[low + index] = sorted[index];
        yield { type: "write", index: low + index, value: sorted[index], array: clone(array) };
      }

      return;
    }

    const pivot = array[high];
    let cursor = low;
    yield { type: "mark", indices: [high], role: "pivot" };

    for (let index = low; index < high; index += 1) {
      yield { type: "compare", indices: [index, high] };

      if (array[index] <= pivot) {
        if (cursor !== index) {
          [array[cursor], array[index]] = [array[index], array[cursor]];
          yield { type: "swap", indices: [cursor, index], array: clone(array) };
        }

        cursor += 1;
      }
    }

    [array[cursor], array[high]] = [array[high], array[cursor]];
    yield { type: "swap", indices: [cursor, high], array: clone(array) };
    yield* sort(low, cursor - 1, depth - 1);
    yield* sort(cursor + 1, high, depth - 1);
  }

  yield* sort(0, array.length - 1, maxDepth);
  yield done(array);
}

function* timSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  const minRun = Math.min(16, Math.max(4, array.length));

  for (let start = 0; start < array.length; start += minRun) {
    const end = Math.min(start + minRun, array.length);
    yield { type: "message", text: `TimSort 首先整理小 run：${start}-${end - 1}。` };

    for (let index = start + 1; index < end; index += 1) {
      const value = array[index];
      let cursor = index - 1;

      while (cursor >= start) {
        yield { type: "compare", indices: [cursor, cursor + 1] };

        if (array[cursor] <= value) {
          break;
        }

        array[cursor + 1] = array[cursor];
        yield { type: "write", index: cursor + 1, value: array[cursor + 1], array: clone(array) };
        cursor -= 1;
      }

      array[cursor + 1] = value;
      yield { type: "write", index: cursor + 1, value, array: clone(array) };
    }
  }

  for (let size = minRun; size < array.length; size *= 2) {
    for (let left = 0; left < array.length - size; left += size * 2) {
      const middle = left + size - 1;
      const right = Math.min(left + size * 2 - 1, array.length - 1);
      const merged = [...array.slice(left, middle + 1), ...array.slice(middle + 1, right + 1)].sort(
        (first, second) => first - second,
      );

      for (let index = 0; index < merged.length; index += 1) {
        array[left + index] = merged[index];
        yield { type: "write", index: left + index, value: merged[index], array: clone(array) };
      }
    }
  }

  yield done(array);
}

function* radixSortMsd(input: number[]): Generator<SortStep> {
  const array = clone(input);
  const maximum = Math.max(...array, 0);
  let place = 1;

  while (Math.floor(maximum / place) >= 10) {
    place *= 10;
  }

  function* sort(left: number, right: number, currentPlace: number): Generator<SortStep> {
    if (left >= right || currentPlace < 1) {
      return;
    }

    const buckets: number[][] = Array.from({ length: 10 }, () => []);

    for (let index = left; index <= right; index += 1) {
      const digit = Math.floor(array[index] / currentPlace) % 10;
      buckets[digit].push(array[index]);
      yield { type: "mark", indices: [index], role: "candidate" };
    }

    let writeIndex = left;
    const ranges: Array<[number, number]> = [];

    for (const bucket of buckets) {
      const start = writeIndex;

      for (const value of bucket) {
        array[writeIndex] = value;
        yield { type: "write", index: writeIndex, value, array: clone(array) };
        writeIndex += 1;
      }

      if (writeIndex - start > 1) {
        ranges.push([start, writeIndex - 1]);
      }
    }

    for (const [start, end] of ranges) {
      yield* sort(start, end, Math.floor(currentPlace / 10));
    }
  }

  yield* sort(0, array.length - 1, place);
  yield done(array);
}

function* pigeonholeSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  const minimum = Math.min(...array);
  const maximum = Math.max(...array);
  const holes = new Array(maximum - minimum + 1).fill(0);

  for (let index = 0; index < array.length; index += 1) {
    holes[array[index] - minimum] += 1;
    yield { type: "mark", indices: [index], role: "candidate" };
  }

  let writeIndex = 0;

  for (let hole = 0; hole < holes.length; hole += 1) {
    while (holes[hole] > 0) {
      const value = hole + minimum;
      array[writeIndex] = value;
      holes[hole] -= 1;
      yield { type: "write", index: writeIndex, value, array: clone(array) };
      writeIndex += 1;
    }
  }

  yield done(array);
}

function* americanFlagSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  const maximum = Math.max(...array, 0);
  let place = 1;

  while (Math.floor(maximum / place) >= 10) {
    place *= 10;
  }

  yield { type: "message", text: "美式旗帜排序首版以桶边界写回模拟原地循环置换。" };

  for (let currentPlace = place; currentPlace >= 1; currentPlace = Math.floor(currentPlace / 10)) {
    const buckets: number[][] = Array.from({ length: 10 }, () => []);

    for (let index = 0; index < array.length; index += 1) {
      const digit = Math.floor(array[index] / currentPlace) % 10;
      buckets[digit].push(array[index]);
      yield { type: "mark", indices: [index], role: "candidate" };
    }

    let writeIndex = 0;

    for (const bucket of buckets) {
      for (const value of bucket) {
        array[writeIndex] = value;
        yield { type: "write", index: writeIndex, value, array: clone(array) };
        writeIndex += 1;
      }
    }
  }

  yield done(array);
}

function* treeSort(input: number[]): Generator<SortStep> {
  type TreeNode = { value: number; left: TreeNode | null; right: TreeNode | null };
  const array = clone(input);
  let root: TreeNode | null = null;

  function insert(node: TreeNode | null, value: number): TreeNode {
    if (!node) {
      return { value, left: null, right: null };
    }

    if (value < node.value) {
      node.left = insert(node.left, value);
    } else {
      node.right = insert(node.right, value);
    }

    return node;
  }

  function traverse(node: TreeNode | null, output: number[]) {
    if (!node) {
      return;
    }

    traverse(node.left, output);
    output.push(node.value);
    traverse(node.right, output);
  }

  for (let index = 0; index < array.length; index += 1) {
    root = insert(root, array[index]);
    yield { type: "mark", indices: [index], role: "candidate" };
  }

  const output: number[] = [];
  traverse(root, output);

  for (let index = 0; index < output.length; index += 1) {
    array[index] = output[index];
    yield { type: "write", index, value: output[index], array: clone(array) };
  }

  yield done(array);
}

function* tournamentSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  const active = array.map(() => true);
  const output: number[] = [];

  while (output.length < array.length) {
    let winner = -1;

    for (let index = 0; index < array.length; index += 1) {
      if (!active[index]) {
        continue;
      }

      if (winner === -1) {
        winner = index;
        yield { type: "mark", indices: [winner], role: "candidate" };
      } else {
        yield { type: "compare", indices: [winner, index] };

        if (array[index] < array[winner]) {
          winner = index;
          yield { type: "mark", indices: [winner], role: "candidate" };
        }
      }
    }

    active[winner] = false;
    output.push(array[winner]);
    yield { type: "write", index: output.length - 1, value: array[winner], array: clone(output) };
  }

  yield done(output);
}

function* strandSort(input: number[]): Generator<SortStep> {
  let remaining = clone(input);
  let output: number[] = [];

  function merge(left: number[], right: number[]) {
    const merged: number[] = [];
    let leftIndex = 0;
    let rightIndex = 0;

    while (leftIndex < left.length && rightIndex < right.length) {
      if (left[leftIndex] <= right[rightIndex]) {
        merged.push(left[leftIndex]);
        leftIndex += 1;
      } else {
        merged.push(right[rightIndex]);
        rightIndex += 1;
      }
    }

    return [...merged, ...left.slice(leftIndex), ...right.slice(rightIndex)];
  }

  while (remaining.length > 0) {
    const strand = [remaining.shift() as number];
    const nextRemaining: number[] = [];

    for (const value of remaining) {
      if (value >= strand[strand.length - 1]) {
        strand.push(value);
      } else {
        nextRemaining.push(value);
      }
    }

    remaining = nextRemaining;
    output = merge(output, strand);
    yield { type: "message", text: `抽出一条递增 strand，长度 ${strand.length}。` };

    for (let index = 0; index < output.length; index += 1) {
      yield { type: "write", index, value: output[index], array: clone(output) };
    }
  }

  yield done(output);
}

function* librarySort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  yield { type: "message", text: "图书馆排序首版用带空位思想的插入演示，真实实现会维护稀疏数组。" };

  for (let index = 1; index < array.length; index += 1) {
    const value = array[index];
    let cursor = index - 1;

    while (cursor >= 0) {
      yield { type: "compare", indices: [cursor, cursor + 1] };

      if (array[cursor] <= value) {
        break;
      }

      array[cursor + 1] = array[cursor];
      yield { type: "write", index: cursor + 1, value: array[cursor + 1], array: clone(array) };
      cursor -= 1;
    }

    array[cursor + 1] = value;
    yield { type: "write", index: cursor + 1, value, array: clone(array) };
  }

  yield done(array);
}

function* beadSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  const sorted = clone(input).sort((left, right) => left - right);
  yield { type: "message", text: "珠排序依赖正整数珠子下落；这里用重力层级效果模拟，不构造大矩阵。" };

  for (let index = 0; index < sorted.length; index += 1) {
    array[index] = sorted[index];
    yield { type: "write", index, value: sorted[index], array: clone(array) };
  }

  yield done(array);
}

function* spaghettiSort(input: number[]): Generator<SortStep> {
  const output = clone(input).sort((left, right) => left - right);
  yield { type: "message", text: "意大利面排序是物理隐喻：先拿最高的面条。首版只模拟抽取顺序。" };

  for (let index = output.length - 1; index >= 0; index -= 1) {
    yield { type: "mark", indices: [index], role: "candidate" };
  }

  yield done(output);
}

function* stoogeSort(input: number[], options: SortOptions): Generator<SortStep> {
  const array = clone(input).slice(0, options.safety.maxArraySize);
  yield { type: "message", text: "Stooge 排序增长很凶，已按危险模式限制规模。" };

  function* sort(left: number, right: number): Generator<SortStep> {
    if (left >= right) {
      return;
    }

    yield { type: "compare", indices: [left, right] };

    if (array[left] > array[right]) {
      [array[left], array[right]] = [array[right], array[left]];
      yield { type: "swap", indices: [left, right], array: clone(array) };
    }

    if (right - left + 1 > 2) {
      const third = Math.floor((right - left + 1) / 3);
      yield* sort(left, right - third);
      yield* sort(left + third, right);
      yield* sort(left, right - third);
    }
  }

  yield* sort(0, array.length - 1);
  yield done(array);
}

function* slowSort(input: number[], options: SortOptions): Generator<SortStep> {
  const array = clone(input).slice(0, options.safety.maxArraySize);
  yield { type: "message", text: "Slow Sort 是反效率教学样本，只在极小数组上演示递归。" };

  function* sort(left: number, right: number): Generator<SortStep> {
    if (left >= right) {
      return;
    }

    const middle = Math.floor((left + right) / 2);
    yield* sort(left, middle);
    yield* sort(middle + 1, right);
    yield { type: "compare", indices: [middle, right] };

    if (array[middle] > array[right]) {
      [array[middle], array[right]] = [array[right], array[middle]];
      yield { type: "swap", indices: [middle, right], array: clone(array) };
    }

    yield* sort(left, right - 1);
  }

  yield* sort(0, array.length - 1);
  yield done(array);
}

function* bozoSort(input: number[], options: SortOptions): Generator<SortStep> {
  const array = clone(input).slice(0, options.safety.maxArraySize);
  let attempts = 0;
  yield { type: "message", text: "Bozo 排序随机交换两个元素，已限制规模和总步数。" };

  while (!isSorted(array)) {
    const left = Math.floor(Math.random() * array.length);
    const right = Math.floor(Math.random() * array.length);
    [array[left], array[right]] = [array[right], array[left]];
    attempts += 1;
    yield { type: "swap", indices: [left, right], array: clone(array) };

    if (attempts > 500) {
      yield { type: "aborted", reason: "随机交换没有在限制内完成，已停止演示。" };
      return;
    }
  }

  yield done(array);
}

function* miracleSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  const sorted = clone(input).sort((left, right) => left - right);
  yield { type: "message", text: "奇迹排序真实逻辑是等待数组自己变有序；这里直接标记为模拟。" };

  for (let index = 0; index < sorted.length; index += 1) {
    array[index] = sorted[index];
    yield { type: "write", index, value: sorted[index], array: clone(array) };
  }

  yield done(array);
}

function* bogoSort(input: number[], options: SortOptions): Generator<SortStep> {
  let array = clone(input).slice(0, options.safety.maxArraySize);
  let attempts = 0;

  yield { type: "message", text: "猴子排序已限制数组规模和总步数。" };

  while (!isSorted(array)) {
    attempts += 1;
    array = shuffle(array);
    yield { type: "shuffle", array: clone(array) };

    if (attempts % 5 === 0) {
      yield { type: "message", text: `已经洗牌 ${attempts} 次，仍在碰运气。` };
    }
  }

  yield done(array);
}

function* stalinSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  let cursor = 1;

  yield { type: "message", text: "斯大林排序会删除破坏递增秩序的元素。" };

  while (cursor < array.length) {
    yield { type: "compare", indices: [cursor - 1, cursor] };

    if (array[cursor] < array[cursor - 1]) {
      array.splice(cursor, 1);
      yield { type: "delete", index: cursor, array: clone(array) };
    } else {
      cursor += 1;
    }
  }

  yield done(array);
}

function* sleepSort(input: number[], options: SortOptions): Generator<SortStep> {
  const sorted = clone(input)
    .slice(0, options.safety.maxArraySize)
    .sort((left, right) => left - right);
  const output: number[] = [];

  yield { type: "message", text: "睡眠排序首版使用模拟时间线，不创建真实定时器。" };

  for (let index = 0; index < sorted.length; index += 1) {
    const value = sorted[index];
    output.push(value);
    yield { type: "message", text: `数值 ${value} 醒来，进入输出队列。` };
    yield { type: "write", index, value, array: clone(output) };
  }

  yield done(output);
}

export const algorithms: Record<string, SortAlgorithm> = {
  "bubble-sort": {
    meta: metaFor("bubble-sort"),
    code: `function bubbleSort(array) {
  for (let end = array.length - 1; end > 0; end--) {
    let swapped = false;
    for (let i = 0; i < end; i++) {
      if (array[i] > array[i + 1]) {
        [array[i], array[i + 1]] = [array[i + 1], array[i]];
        swapped = true;
      }
    }
    if (!swapped) break;
  }
  return array;
}`,
    generateSteps: bubbleSort,
  },
  "selection-sort": {
    meta: metaFor("selection-sort"),
    code: `function selectionSort(array) {
  for (let start = 0; start < array.length - 1; start++) {
    let min = start;
    for (let i = start + 1; i < array.length; i++) {
      if (array[i] < array[min]) min = i;
    }
    [array[start], array[min]] = [array[min], array[start]];
  }
  return array;
}`,
    generateSteps: selectionSort,
  },
  "insertion-sort": {
    meta: metaFor("insertion-sort"),
    code: `function insertionSort(array) {
  for (let i = 1; i < array.length; i++) {
    const value = array[i];
    let j = i - 1;
    while (j >= 0 && array[j] > value) {
      array[j + 1] = array[j];
      j--;
    }
    array[j + 1] = value;
  }
  return array;
}`,
    generateSteps: insertionSort,
  },
  "merge-sort": {
    meta: metaFor("merge-sort"),
    code: `function mergeSort(array) {
  if (array.length <= 1) return array;
  const mid = Math.floor(array.length / 2);
  return merge(mergeSort(array.slice(0, mid)), mergeSort(array.slice(mid)));
}`,
    generateSteps: mergeSort,
  },
  "quick-sort": {
    meta: metaFor("quick-sort"),
    code: `function quickSort(array, low = 0, high = array.length - 1) {
  if (low >= high) return array;
  const pivot = partition(array, low, high);
  quickSort(array, low, pivot - 1);
  quickSort(array, pivot + 1, high);
  return array;
}`,
    generateSteps: quickSort,
  },
  "heap-sort": {
    meta: metaFor("heap-sort"),
    code: `function heapSort(array) {
  buildMaxHeap(array);
  for (let end = array.length - 1; end > 0; end--) {
    [array[0], array[end]] = [array[end], array[0]];
    heapify(array, end, 0);
  }
  return array;
}`,
    generateSteps: heapSort,
  },
  "counting-sort": {
    meta: metaFor("counting-sort"),
    code: `function countingSort(array) {
  const counts = new Array(Math.max(...array) + 1).fill(0);
  for (const value of array) counts[value]++;
  let index = 0;
  for (let value = 0; value < counts.length; value++) {
    while (counts[value]-- > 0) array[index++] = value;
  }
  return array;
}`,
    generateSteps: countingSort,
  },
  "radix-sort-lsd": {
    meta: metaFor("radix-sort-lsd"),
    code: `function radixSortLsd(array) {
  for (let place = 1; Math.floor(max(array) / place) > 0; place *= 10) {
    stableBucketByDigit(array, place);
  }
  return array;
}`,
    generateSteps: radixSortLsd,
  },
  "bucket-sort": {
    meta: metaFor("bucket-sort"),
    code: `function bucketSort(array) {
  const buckets = distributeByRange(array);
  for (const bucket of buckets) insertionSort(bucket);
  return buckets.flat();
}`,
    generateSteps: bucketSort,
  },
  "shell-sort": {
    meta: metaFor("shell-sort"),
    code: `function shellSort(array) {
  for (let gap = Math.floor(array.length / 2); gap > 0; gap = Math.floor(gap / 2)) {
    gapInsertionSort(array, gap);
  }
  return array;
}`,
    generateSteps: shellSort,
  },
  "comb-sort": {
    meta: metaFor("comb-sort"),
    code: `function combSort(array) {
  let gap = array.length;
  let swapped = true;
  while (gap > 1 || swapped) {
    gap = Math.max(1, Math.floor(gap / 1.3));
    swapped = compareAndSwapByGap(array, gap);
  }
  return array;
}`,
    generateSteps: combSort,
  },
  "cocktail-shaker-sort": {
    meta: metaFor("cocktail-shaker-sort"),
    code: `function cocktailShakerSort(array) {
  let start = 0;
  let end = array.length - 1;
  while (start < end) {
    bubbleForward(array, start, end);
    bubbleBackward(array, start, --end);
    start++;
  }
  return array;
}`,
    generateSteps: cocktailShakerSort,
  },
  "odd-even-sort": {
    meta: metaFor("odd-even-sort"),
    code: `function oddEvenSort(array) {
  let sorted = false;
  while (!sorted) {
    sorted = passOddPairs(array) && passEvenPairs(array);
  }
  return array;
}`,
    generateSteps: oddEvenSort,
  },
  "gnome-sort": {
    meta: metaFor("gnome-sort"),
    code: `function gnomeSort(array) {
  let i = 0;
  while (i < array.length) {
    if (i === 0 || array[i - 1] <= array[i]) i++;
    else swap(array, i, --i);
  }
  return array;
}`,
    generateSteps: gnomeSort,
  },
  "pancake-sort": {
    meta: metaFor("pancake-sort"),
    code: `function pancakeSort(array) {
  for (let size = array.length; size > 1; size--) {
    flip(array, indexOfMax(array, size));
    flip(array, size - 1);
  }
  return array;
}`,
    generateSteps: pancakeSort,
  },
  "cycle-sort": {
    meta: metaFor("cycle-sort"),
    code: `function cycleSort(array) {
  for (let start = 0; start < array.length - 1; start++) {
    rotateItemToFinalPosition(array, start);
  }
  return array;
}`,
    generateSteps: cycleSort,
  },
  "patience-sort": {
    meta: metaFor("patience-sort"),
    code: `function patienceSort(array) {
  const piles = dealIntoSortedPiles(array);
  return repeatedlyTakeSmallestPileTop(piles);
}`,
    generateSteps: patienceSort,
  },
  "binary-insertion-sort": {
    meta: metaFor("binary-insertion-sort"),
    code: `function binaryInsertionSort(array) {
  for (let i = 1; i < array.length; i++) {
    const pos = binarySearch(array, 0, i, array[i]);
    insertAt(array, i, pos);
  }
  return array;
}`,
    generateSteps: binaryInsertionSort,
  },
  "bottom-up-merge-sort": {
    meta: metaFor("bottom-up-merge-sort"),
    code: `function bottomUpMergeSort(array) {
  for (let width = 1; width < array.length; width *= 2) {
    mergeAdjacentRuns(array, width);
  }
  return array;
}`,
    generateSteps: bottomUpMergeSort,
  },
  "natural-merge-sort": {
    meta: metaFor("natural-merge-sort"),
    code: `function naturalMergeSort(array) {
  while (!isSorted(array)) {
    const runs = findIncreasingRuns(array);
    mergeNeighborRuns(array, runs);
  }
  return array;
}`,
    generateSteps: naturalMergeSort,
  },
  "three-way-quick-sort": {
    meta: metaFor("three-way-quick-sort"),
    code: `function threeWayQuickSort(array) {
  partitionIntoLessEqualGreater(array);
  recursivelySortOuterParts(array);
  return array;
}`,
    generateSteps: threeWayQuickSort,
  },
  "dual-pivot-quick-sort": {
    meta: metaFor("dual-pivot-quick-sort"),
    code: `function dualPivotQuickSort(array) {
  chooseTwoPivots(array);
  partitionIntoThreeRegions(array);
  recursivelySortRegions(array);
  return array;
}`,
    generateSteps: dualPivotQuickSort,
  },
  "intro-sort": {
    meta: metaFor("intro-sort"),
    code: `function introSort(array) {
  quickSortUntilDepthLimit(array);
  heapSortWhenRecursionGetsTooDeep(array);
  insertionSortSmallPartitions(array);
  return array;
}`,
    generateSteps: introSort,
  },
  "tim-sort": {
    meta: metaFor("tim-sort"),
    code: `function timSort(array) {
  const runs = detectAndExtendRuns(array);
  mergeRunsByStackInvariant(runs);
  return array;
}`,
    generateSteps: timSort,
  },
  "radix-sort-msd": {
    meta: metaFor("radix-sort-msd"),
    code: `function radixSortMsd(array) {
  bucketByMostSignificantDigit(array);
  recursivelyBucketEachDigit(array);
  return array;
}`,
    generateSteps: radixSortMsd,
  },
  "pigeonhole-sort": {
    meta: metaFor("pigeonhole-sort"),
    code: `function pigeonholeSort(array) {
  const holes = countValuesBetweenMinAndMax(array);
  writeBackByHoleOrder(array, holes);
  return array;
}`,
    generateSteps: pigeonholeSort,
  },
  "american-flag-sort": {
    meta: metaFor("american-flag-sort"),
    code: `function americanFlagSort(array) {
  for (const digit of digitsFromLeftToRight(array)) {
    inPlaceBucketCycle(array, digit);
  }
  return array;
}`,
    generateSteps: americanFlagSort,
  },
  "tree-sort": {
    meta: metaFor("tree-sort"),
    code: `function treeSort(array) {
  const tree = buildBinarySearchTree(array);
  return inorderTraversal(tree);
}`,
    generateSteps: treeSort,
  },
  "tournament-sort": {
    meta: metaFor("tournament-sort"),
    code: `function tournamentSort(array) {
  while (array has active values) {
    output.push(winnerOfTournamentTree(array));
  }
  return output;
}`,
    generateSteps: tournamentSort,
  },
  "strand-sort": {
    meta: metaFor("strand-sort"),
    code: `function strandSort(array) {
  while (array.length) {
    output = merge(output, pullIncreasingStrand(array));
  }
  return output;
}`,
    generateSteps: strandSort,
  },
  "library-sort": {
    meta: metaFor("library-sort"),
    code: `function librarySort(array) {
  insertItemsIntoSparseGappedArray(array);
  rebalanceGapsWhenNeeded(array);
  return compact(array);
}`,
    generateSteps: librarySort,
  },
  "bead-sort": {
    meta: metaFor("bead-sort"),
    code: `function beadSort(array) {
  const beads = buildBeadGrid(array);
  let gravity move beads downward;
  return readRows(beads);
}`,
    generateSteps: beadSort,
  },
  "spaghetti-sort": {
    meta: metaFor("spaghetti-sort"),
    code: `function spaghettiSort(array) {
  representValuesAsLengths(array);
  repeatedlyPullLongestLength();
  return reversePulledOrder();
}`,
    generateSteps: spaghettiSort,
  },
  "stooge-sort": {
    meta: metaFor("stooge-sort"),
    code: `function stoogeSort(array, i, j) {
  if (array[i] > array[j]) swap(array, i, j);
  if (j - i + 1 > 2) {
    const third = Math.floor((j - i + 1) / 3);
    stoogeSort(array, i, j - third);
    stoogeSort(array, i + third, j);
    stoogeSort(array, i, j - third);
  }
  return array;
}`,
    generateSteps: stoogeSort,
  },
  "slow-sort": {
    meta: metaFor("slow-sort"),
    code: `function slowSort(array, i, j) {
  if (i >= j) return array;
  const m = Math.floor((i + j) / 2);
  slowSort(array, i, m);
  slowSort(array, m + 1, j);
  if (array[m] > array[j]) swap(array, m, j);
  slowSort(array, i, j - 1);
  return array;
}`,
    generateSteps: slowSort,
  },
  "bozo-sort": {
    meta: metaFor("bozo-sort"),
    code: `function bozoSort(array) {
  while (!isSorted(array)) {
    swapTwoRandomPositions(array);
  }
  return array;
}`,
    generateSteps: bozoSort,
  },
  "miracle-sort": {
    meta: metaFor("miracle-sort"),
    code: `function miracleSort(array) {
  while (!isSorted(array)) {
    waitForAMiracle();
  }
  return array;
}`,
    generateSteps: miracleSort,
  },
  "bogo-sort": {
    meta: metaFor("bogo-sort"),
    code: `function bogoSort(array) {
  while (!isSorted(array)) {
    shuffle(array);
  }
  return array;
}
// Sorting Zoo 会限制数组规模、步骤数和运行时间。`,
    generateSteps: bogoSort,
  },
  "stalin-sort": {
    meta: metaFor("stalin-sort"),
    code: `function stalinSort(array) {
  const output = [array[0]];
  for (const value of array.slice(1)) {
    if (value >= output[output.length - 1]) output.push(value);
  }
  return output;
}`,
    generateSteps: stalinSort,
  },
  "sleep-sort": {
    meta: metaFor("sleep-sort"),
    code: `function sleepSort(array, emit) {
  for (const value of array) {
    setTimeout(() => emit(value), value);
  }
}
// Sorting Zoo 首版只做模拟演示，不启动真实定时器排序。`,
    generateSteps: sleepSort,
  },
};
