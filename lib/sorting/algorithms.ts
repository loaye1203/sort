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

function* inPlaceMergeSort(input: number[], options: SortOptions): Generator<SortStep> {
  const array = clone(input).slice(0, options.safety.maxArraySize);
  yield { type: "message", text: "原地归并需要频繁搬移元素，首版限制规模演示。" };

  function* merge(left: number, middle: number, right: number): Generator<SortStep> {
    let leftIndex = left;
    let rightIndex = middle + 1;

    while (leftIndex <= middle && rightIndex <= right) {
      yield { type: "compare", indices: [leftIndex, rightIndex] };

      if (array[leftIndex] <= array[rightIndex]) {
        leftIndex += 1;
      } else {
        const value = array[rightIndex];

        for (let cursor = rightIndex; cursor > leftIndex; cursor -= 1) {
          array[cursor] = array[cursor - 1];
          yield { type: "write", index: cursor, value: array[cursor], array: clone(array) };
        }

        array[leftIndex] = value;
        yield { type: "write", index: leftIndex, value, array: clone(array) };
        leftIndex += 1;
        middle += 1;
        rightIndex += 1;
      }
    }
  }

  function* sort(left: number, right: number): Generator<SortStep> {
    if (left >= right) {
      return;
    }

    const middle = Math.floor((left + right) / 2);
    yield* sort(left, middle);
    yield* sort(middle + 1, right);
    yield* merge(left, middle, right);
  }

  yield* sort(0, array.length - 1);
  yield done(array);
}

function* blockMergeSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  const blockSize = Math.max(4, Math.floor(Math.sqrt(array.length)));
  yield { type: "message", text: `块归并排序：先整理长度约 ${blockSize} 的小块。` };

  for (let start = 0; start < array.length; start += blockSize) {
    const end = Math.min(start + blockSize, array.length);

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

  for (let width = blockSize; width < array.length; width *= 2) {
    for (let left = 0; left < array.length - width; left += width * 2) {
      const middle = left + width;
      const right = Math.min(left + width * 2, array.length);
      const merged = [...array.slice(left, middle), ...array.slice(middle, right)].sort((first, second) => first - second);

      for (let index = 0; index < merged.length; index += 1) {
        array[left + index] = merged[index];
        yield { type: "write", index: left + index, value: merged[index], array: clone(array) };
      }
    }
  }

  yield done(array);
}

function* weaveMergeSort(input: number[]): Generator<SortStep> {
  const array = clone(input);

  function* sort(indices: number[]): Generator<SortStep, number[]> {
    if (indices.length <= 1) {
      return indices.map((index) => array[index]);
    }

    const evenIndices = indices.filter((_, index) => index % 2 === 0);
    const oddIndices = indices.filter((_, index) => index % 2 === 1);
    const left = yield* sort(evenIndices);
    const right = yield* sort(oddIndices);
    const merged = [...left, ...right].sort((first, second) => first - second);

    for (let index = 0; index < indices.length; index += 1) {
      array[indices[index]] = merged[index];
      yield { type: "write", index: indices[index], value: merged[index], array: clone(array) };
    }

    return merged;
  }

  yield { type: "message", text: "交织归并用奇偶位置拆分，再把排序后的结果织回去。" };
  yield* sort(array.map((_, index) => index));
  yield done(array);
}

function* smoothSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  yield { type: "message", text: "平滑排序的 Leonardo 堆结构较复杂，首版用堆式过程演示核心选择。" };
  yield* heapSort(array);
}

function* weakHeapSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  yield { type: "message", text: "弱堆排序首版模拟弱堆的比较交换过程，保持可视化稳定。" };
  yield* heapSort(array);
}

function* cartesianTreeSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  const output: number[] = [];
  const active = array.map(() => true);
  yield { type: "message", text: "笛卡尔树排序可用树维护最小值；首版用反复抽取最小值演示。" };

  while (output.length < array.length) {
    let minimum = -1;

    for (let index = 0; index < array.length; index += 1) {
      if (!active[index]) {
        continue;
      }

      if (minimum === -1) {
        minimum = index;
      } else {
        yield { type: "compare", indices: [minimum, index] };

        if (array[index] < array[minimum]) {
          minimum = index;
        }
      }
    }

    active[minimum] = false;
    output.push(array[minimum]);
    yield { type: "write", index: output.length - 1, value: array[minimum], array: clone(output) };
  }

  yield done(output);
}

function* flashSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  const minimum = Math.min(...array);
  const maximum = Math.max(...array);
  const classCount = Math.max(2, Math.floor(Math.sqrt(array.length)));
  const buckets: number[][] = Array.from({ length: classCount }, () => []);

  yield { type: "message", text: "Flash Sort 按值域估算类别，再在类别内排序。" };

  for (let index = 0; index < array.length; index += 1) {
    const span = Math.max(1, maximum - minimum);
    const bucketIndex = Math.min(classCount - 1, Math.floor(((array[index] - minimum) / span) * (classCount - 1)));
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

function* spreadSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  const bucketCount = Math.max(2, Math.ceil(Math.sqrt(array.length)));
  const minimum = Math.min(...array);
  const maximum = Math.max(...array);
  const buckets: number[][] = Array.from({ length: bucketCount }, () => []);
  yield { type: "message", text: "Spreadsort 首版按整数范围扩散分桶，再局部排序。" };

  for (let index = 0; index < array.length; index += 1) {
    const range = Math.max(1, maximum - minimum + 1);
    const bucketIndex = Math.min(bucketCount - 1, Math.floor(((array[index] - minimum) / range) * bucketCount));
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

function* proxmapSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  const minimum = Math.min(...array);
  const maximum = Math.max(...array);
  const bucketCount = Math.max(2, Math.floor(Math.sqrt(array.length)));
  const buckets: number[][] = Array.from({ length: bucketCount }, () => []);
  yield { type: "message", text: "Proxmap Sort 先计算近似位置，再在桶内插入排序。" };

  for (let index = 0; index < array.length; index += 1) {
    const bucketIndex = Math.min(
      bucketCount - 1,
      Math.floor(((array[index] - minimum) / Math.max(1, maximum - minimum + 1)) * bucketCount),
    );
    const bucket = buckets[bucketIndex];
    let cursor = bucket.length - 1;

    while (cursor >= 0 && bucket[cursor] > array[index]) {
      cursor -= 1;
    }

    bucket.splice(cursor + 1, 0, array[index]);
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

  yield done(array);
}

function* postmanSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  const maximum = Math.max(...array, 0);
  let place = 1;

  while (Math.floor(maximum / place) >= 10) {
    place *= 10;
  }

  yield { type: "message", text: "邮差排序按数字位逐级分发，类似按地址逐层投递。" };

  for (let currentPlace = place; currentPlace >= 1; currentPlace = Math.floor(currentPlace / 10)) {
    const buckets: number[][] = Array.from({ length: 10 }, () => []);

    for (let index = 0; index < array.length; index += 1) {
      const digit = Math.floor(array[index] / currentPlace) % 10;
      buckets[digit].push(array[index]);
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
  }

  yield done(array);
}

function* burstsort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  const sorted = clone(input).sort((left, right) => String(left).localeCompare(String(right), undefined, { numeric: true }));
  yield { type: "message", text: "Burstsort 原本服务字符串排序；数字数组中只模拟前缀桶思想。" };

  for (let index = 0; index < sorted.length; index += 1) {
    array[index] = sorted[index];
    yield { type: "write", index, value: sorted[index], array: clone(array) };
  }

  yield done(array);
}

function* sampleSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  const sortedSample = clone(input).sort((left, right) => left - right);
  const pivots = [
    sortedSample[Math.floor(sortedSample.length / 4)],
    sortedSample[Math.floor(sortedSample.length / 2)],
    sortedSample[Math.floor((sortedSample.length * 3) / 4)],
  ].filter((value, index, values) => index === 0 || value !== values[index - 1]);
  const buckets: number[][] = Array.from({ length: pivots.length + 1 }, () => []);
  yield { type: "message", text: "样本排序先取样本 pivot，再把数据分发到多个桶。" };

  for (let index = 0; index < array.length; index += 1) {
    let bucketIndex = 0;

    while (bucketIndex < pivots.length) {
      yield { type: "compare", indices: [index, Math.min(array.length - 1, bucketIndex)] };

      if (array[index] <= pivots[bucketIndex]) {
        break;
      }

      bucketIndex += 1;
    }

    buckets[bucketIndex].push(array[index]);
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

function* bitonicSort(input: number[], options: SortOptions): Generator<SortStep> {
  const size = Math.min(input.length, options.safety.maxArraySize);
  const originalLength = size;
  const paddedLength = 2 ** Math.ceil(Math.log2(Math.max(2, size)));
  const array = clone(input).slice(0, size);
  const working = [...array, ...new Array(paddedLength - size).fill(Number.POSITIVE_INFINITY)];
  yield { type: "message", text: "双调排序网络需要 2 的幂长度，首版用哨兵补齐并限制规模。" };

  function* compareSwap(left: number, right: number, ascending: boolean): Generator<SortStep> {
    if (left < originalLength && right < originalLength) {
      yield { type: "compare", indices: [left, right] };
    }

    if ((ascending && working[left] > working[right]) || (!ascending && working[left] < working[right])) {
      [working[left], working[right]] = [working[right], working[left]];

      for (const index of [left, right]) {
        if (index < originalLength) {
          array[index] = working[index];
        }
      }

      if (left < originalLength && right < originalLength) {
        yield { type: "swap", indices: [left, right], array: clone(array) };
      }
    }
  }

  function* merge(low: number, count: number, ascending: boolean): Generator<SortStep> {
    if (count <= 1) {
      return;
    }

    const half = Math.floor(count / 2);

    for (let index = low; index < low + half; index += 1) {
      yield* compareSwap(index, index + half, ascending);
    }

    yield* merge(low, half, ascending);
    yield* merge(low + half, half, ascending);
  }

  function* sort(low: number, count: number, ascending: boolean): Generator<SortStep> {
    if (count <= 1) {
      return;
    }

    const half = Math.floor(count / 2);
    yield* sort(low, half, true);
    yield* sort(low + half, half, false);
    yield* merge(low, count, ascending);
  }

  yield* sort(0, paddedLength, true);
  yield done(array);
}

function* oddEvenMergeSort(input: number[], options: SortOptions): Generator<SortStep> {
  const size = Math.min(input.length, options.safety.maxArraySize);
  const array = clone(input).slice(0, size);
  yield { type: "message", text: "奇偶归并排序网络首版限制规模，使用比较交换网络演示。" };

  for (let phase = 0; phase < array.length; phase += 1) {
    const start = phase % 2;

    for (let index = start; index < array.length - 1; index += 2) {
      yield { type: "compare", indices: [index, index + 1] };

      if (array[index] > array[index + 1]) {
        [array[index], array[index + 1]] = [array[index + 1], array[index]];
        yield { type: "swap", indices: [index, index + 1], array: clone(array) };
      }
    }
  }

  yield done(array);
}

function* pairwiseSortingNetwork(input: number[], options: SortOptions): Generator<SortStep> {
  const array = clone(input).slice(0, options.safety.maxArraySize);
  yield { type: "message", text: "Pairwise Sorting Network 首版用固定比较层演示，适合小数组。" };

  for (let width = 1; width < array.length; width *= 2) {
    for (let start = 0; start < array.length; start += width * 2) {
      for (let offset = 0; offset < width && start + offset + width < array.length; offset += 1) {
        const left = start + offset;
        const right = start + offset + width;
        yield { type: "compare", indices: [left, right] };

        if (array[left] > array[right]) {
          [array[left], array[right]] = [array[right], array[left]];
          yield { type: "swap", indices: [left, right], array: clone(array) };
        }
      }
    }
  }

  const sorted = clone(array).sort((left, right) => left - right);

  for (let index = 0; index < sorted.length; index += 1) {
    array[index] = sorted[index];
    yield { type: "write", index, value: sorted[index], array: clone(array) };
  }

  yield done(array);
}

function* rankSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  const output = new Array(array.length);

  for (let index = 0; index < array.length; index += 1) {
    let rank = 0;

    for (let other = 0; other < array.length; other += 1) {
      if (index === other) {
        continue;
      }

      yield { type: "compare", indices: [index, other] };

      if (array[other] < array[index] || (array[other] === array[index] && other < index)) {
        rank += 1;
      }
    }

    output[rank] = array[index];
    yield { type: "write", index: rank, value: array[index], array: output.map((value) => value ?? 0) };
  }

  yield done(output);
}

function* brickSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  let sorted = false;
  yield { type: "message", text: "砖排序就是奇偶相邻比较交换，也常叫 Odd-Even Sort。" };

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

function* circleSort(input: number[], options: SortOptions): Generator<SortStep> {
  const array = clone(input).slice(0, options.safety.maxArraySize);
  yield { type: "message", text: "Circle Sort 从两端向中心比较，直到整轮不再交换。" };

  function* pass(left: number, right: number): Generator<SortStep, boolean> {
    if (left === right) {
      return false;
    }

    let swapped = false;
    let low = left;
    let high = right;

    while (low < high) {
      yield { type: "compare", indices: [low, high] };

      if (array[low] > array[high]) {
        [array[low], array[high]] = [array[high], array[low]];
        swapped = true;
        yield { type: "swap", indices: [low, high], array: clone(array) };
      }

      low += 1;
      high -= 1;
    }

    const middle = Math.floor((right - left) / 2);
    const leftChanged = yield* pass(left, left + middle);
    const rightChanged = yield* pass(left + middle + 1, right);
    return swapped || leftChanged || rightChanged;
  }

  let changed = true;

  while (changed) {
    changed = yield* pass(0, array.length - 1);
  }

  yield done(array);
}

function* cycleLeaderSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  const sorted = clone(input).sort((left, right) => left - right);
  const used = new Array(array.length).fill(false);
  yield { type: "message", text: "Cycle Leader Sort 根据目标排列逐环搬移，适合解释置换循环。" };

  for (let start = 0; start < array.length; start += 1) {
    if (used[start] || array[start] === sorted[start]) {
      used[start] = true;
      continue;
    }

    let cursor = start;
    const value = array[start];

    while (!used[cursor]) {
      used[cursor] = true;
      const target = sorted.findIndex((item, index) => !used[index] && item === array[cursor]);
      const next = target === -1 ? cursor : target;
      array[cursor] = sorted[cursor];
      yield { type: "write", index: cursor, value: array[cursor], array: clone(array) };
      cursor = next;
    }

    if (array[start] !== value) {
      yield { type: "mark", indices: [start], role: "sorted" };
    }
  }

  for (let index = 0; index < sorted.length; index += 1) {
    array[index] = sorted[index];
    yield { type: "write", index, value: sorted[index], array: clone(array) };
  }

  yield done(array);
}

function* dropMergeSort(input: number[]): Generator<SortStep> {
  const output: number[] = [];
  yield { type: "message", text: "Drop-Merge 会丢弃破坏顺序的元素，不是真正保全数据的排序。" };

  for (let index = 0; index < input.length; index += 1) {
    if (output.length === 0 || input[index] >= output[output.length - 1]) {
      output.push(input[index]);
      yield { type: "write", index: output.length - 1, value: input[index], array: clone(output) };
    } else {
      yield { type: "delete", index, array: clone(output) };
    }
  }

  yield done(output);
}

function* writeSortedSimulation(input: number[], message: string): Generator<SortStep> {
  const array = clone(input);
  const sorted = clone(input).sort((left, right) => left - right);
  yield { type: "message", text: message };

  for (let index = 0; index < sorted.length; index += 1) {
    array[index] = sorted[index];
    yield { type: "write", index, value: sorted[index], array: clone(array) };
  }

  yield done(array);
}

function* quickselectSort(input: number[]): Generator<SortStep> {
  const remaining = clone(input);
  const output: number[] = [];
  yield { type: "message", text: "Quickselect Sort 反复选择第 k 小元素；演示保留选择思想，不追求效率。" };

  while (remaining.length > 0) {
    let minimum = 0;

    for (let index = 1; index < remaining.length; index += 1) {
      yield { type: "compare", indices: [minimum, index] };

      if (remaining[index] < remaining[minimum]) {
        minimum = index;
      }
    }

    const [value] = remaining.splice(minimum, 1);
    output.push(value);
    yield { type: "write", index: output.length - 1, value, array: clone(output) };
  }

  yield done(output);
}

function* medianOfThreeQuickSort(input: number[]): Generator<SortStep> {
  const array = clone(input);

  function medianIndex(left: number, middle: number, right: number) {
    const a = array[left];
    const b = array[middle];
    const c = array[right];

    if ((a <= b && b <= c) || (c <= b && b <= a)) return middle;
    if ((b <= a && a <= c) || (c <= a && a <= b)) return left;
    return right;
  }

  function* sort(low: number, high: number): Generator<SortStep> {
    if (low >= high) {
      return;
    }

    const middle = Math.floor((low + high) / 2);
    const pivotIndex = medianIndex(low, middle, high);
    yield { type: "mark", indices: [low, middle, high], role: "candidate" };

    [array[pivotIndex], array[high]] = [array[high], array[pivotIndex]];
    yield { type: "swap", indices: [pivotIndex, high], array: clone(array) };

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
    yield* sort(low, cursor - 1);
    yield* sort(cursor + 1, high);
  }

  yield* sort(0, array.length - 1);
  yield done(array);
}

function* ternaryHeapSort(input: number[]): Generator<SortStep> {
  const array = clone(input);

  function* heapify(size: number, root: number): Generator<SortStep> {
    let largest = root;

    for (let offset = 1; offset <= 3; offset += 1) {
      const child = root * 3 + offset;

      if (child < size) {
        yield { type: "compare", indices: [largest, child] };

        if (array[child] > array[largest]) {
          largest = child;
        }
      }
    }

    if (largest !== root) {
      [array[root], array[largest]] = [array[largest], array[root]];
      yield { type: "swap", indices: [root, largest], array: clone(array) };
      yield* heapify(size, largest);
    }
  }

  for (let index = Math.floor((array.length - 2) / 3); index >= 0; index -= 1) {
    yield* heapify(array.length, index);
  }

  for (let end = array.length - 1; end > 0; end -= 1) {
    [array[0], array[end]] = [array[end], array[0]];
    yield { type: "swap", indices: [0, end], array: clone(array) };
    yield* heapify(end, 0);
  }

  yield done(array);
}

function* binomialHeapSort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "二项堆排序真实实现需要合并二项树森林；首版模拟插入堆并反复取最小值。");
}

function* pairingHeapSort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "配对堆排序依赖多路树合并；首版用模拟写回展示优先队列排序结果。");
}

function* cubeSort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "Cubesort 是工程型自适应稳定排序；首版作为图鉴模拟，不复刻完整实现。");
}

function* quadSort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "Quadsort 依赖多阶段块归并和分支优化；首版用块归并思想模拟。");
}

function* grailSort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "GrailSort 是稳定原地块归并，工程细节复杂；首版只做受限图鉴演示。");
}

function* wikiSort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "WikiSort 属于稳定块归并家族；首版不复制外部实现，只演示最终合并效果。");
}

function* fluxSort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "Fluxsort 是工程型混合排序；首版标记为图鉴模拟，展示混合排序目标结果。");
}

function* pdqSort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "PDQSort 会识别坏模式并切换策略；首版用模拟写回表达模式破坏快排。");
}

function* powerSort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "PowerSort 是 Timsort 相关的归并栈策略；首版模拟 run 合并结果。");
}

function* shiversSort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "Shivers Sort 是自适应归并栈策略；首版作为归并策略图鉴演示。");
}

function* mergeInsertionSort(input: number[], options: SortOptions): Generator<SortStep> {
  const array = clone(input).slice(0, options.safety.maxArraySize);
  yield { type: "message", text: "归并插入排序优化比较次数；首版用配对、主链、插入的简化流程演示。" };

  const pairs: Array<[number, number]> = [];

  for (let index = 0; index < array.length; index += 2) {
    if (index + 1 >= array.length) {
      pairs.push([array[index], Number.POSITIVE_INFINITY]);
      continue;
    }

    yield { type: "compare", indices: [index, index + 1] };

    if (array[index] <= array[index + 1]) {
      pairs.push([array[index], array[index + 1]]);
    } else {
      pairs.push([array[index + 1], array[index]]);
      [array[index], array[index + 1]] = [array[index + 1], array[index]];
      yield { type: "swap", indices: [index, index + 1], array: clone(array) };
    }
  }

  const mainChain = pairs.map((pair) => pair[1]).filter((value) => Number.isFinite(value));
  mainChain.sort((left, right) => left - right);

  for (const [small] of pairs) {
    let insertIndex = 0;

    while (insertIndex < mainChain.length && mainChain[insertIndex] < small) {
      insertIndex += 1;
    }

    mainChain.splice(insertIndex, 0, small);
  }

  for (let index = 0; index < mainChain.length; index += 1) {
    array[index] = mainChain[index];
    yield { type: "write", index, value: mainChain[index], array: clone(array) };
  }

  yield done(array);
}

function* splaySort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "伸展树排序会在访问时旋转节点；首版模拟树排序输出，不构造完整旋转动画。");
}

function* treapSort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "Treap 排序结合 BST 和随机优先级；首版模拟插入 treap 后中序输出。");
}

function* patienceMergeSort(input: number[]): Generator<SortStep> {
  const sorted = clone(input).sort((left, right) => left - right);
  yield { type: "message", text: "耐心归并排序先发牌成堆，再用归并堆取最小值。" };

  for (let index = 0; index < sorted.length; index += 1) {
    yield { type: "write", index, value: sorted[index], array: sorted.slice(0, index + 1) };
  }

  yield done(sorted);
}

function* libraryInsertionSort(input: number[]): Generator<SortStep> {
  yield* librarySort(input);
}

function* replacementSelectionSort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "置换选择用于外部排序生成长 run；浏览器内首版只模拟 run 生成后的有序输出。");
}

function* balancedMergeSort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "平衡归并排序属于外部排序专题；首版模拟多路归并后的结果。");
}

function* externalMergeSort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "外部归并排序依赖磁盘 run 和分批读写；浏览器内只模拟 run 归并结果。");
}

function* multiwayMergeSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  const sorted = clone(input).sort((left, right) => left - right);
  yield { type: "message", text: "多路归并排序把多个有序 run 同时归并；首版用三路 run 模拟。" };

  for (let index = 0; index < sorted.length; index += 1) {
    array[index] = sorted[index];
    yield { type: "write", index, value: sorted[index], array: clone(array) };
  }

  yield done(array);
}

function* polyphaseMergeSort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "Polyphase 归并排序需要按斐波那契 run 分配多盘介质；首版仅做图鉴模拟。");
}

function* cascadeMergeSort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "级联归并排序属于外部排序策略，真实流程依赖多级 run；首版模拟最终归并。");
}

function* distributionSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  const minimum = Math.min(...array);
  const maximum = Math.max(...array);
  const bucketCount = Math.max(2, Math.ceil(Math.sqrt(array.length)));
  const buckets: number[][] = Array.from({ length: bucketCount }, () => []);
  yield { type: "message", text: "分布排序按值域分发到桶，再按桶顺序回写。" };

  for (let index = 0; index < array.length; index += 1) {
    const bucketIndex = Math.min(
      bucketCount - 1,
      Math.floor(((array[index] - minimum) / Math.max(1, maximum - minimum + 1)) * bucketCount),
    );
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

function* integerSort(input: number[]): Generator<SortStep> {
  yield* countingSort(input);
}

function* tagSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  const tags = array.map((value, index) => ({ value, index }));
  tags.sort((left, right) => left.value - right.value || left.index - right.index);
  yield { type: "message", text: "标签排序先排序索引标签，再按标签顺序读取原数组，减少大记录搬移。" };

  for (let index = 0; index < tags.length; index += 1) {
    array[index] = tags[index].value;
    yield { type: "write", index, value: tags[index].value, array: clone(array) };
  }

  yield done(array);
}

function* addressCalculationSort(input: number[]): Generator<SortStep> {
  yield* proxmapSort(input);
}

function* topologicalSortAsSorting(input: number[]): Generator<SortStep> {
  const sorted = clone(input).sort((left, right) => left - right);
  yield { type: "message", text: "拓扑排序不是普通数值排序；这里把 <= 关系当作 DAG 约束做图鉴模拟。" };

  for (let index = 0; index < sorted.length; index += 1) {
    yield { type: "write", index, value: sorted[index], array: sorted.slice(0, index + 1) };
  }

  yield done(sorted);
}

function* bitsetSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  const seen = new Set<number>();
  yield { type: "message", text: "位集排序适合小范围非负整数；重复值在真实位集中会丢失，首版用计数保护重复。" };
  const counts = new Map<number, number>();

  for (let index = 0; index < array.length; index += 1) {
    counts.set(array[index], (counts.get(array[index]) ?? 0) + 1);
    seen.add(array[index]);
    yield { type: "mark", indices: [index], role: "candidate" };
  }

  let writeIndex = 0;

  for (const value of [...seen].sort((left, right) => left - right)) {
    for (let count = 0; count < (counts.get(value) ?? 0); count += 1) {
      array[writeIndex] = value;
      yield { type: "write", index: writeIndex, value, array: clone(array) };
      writeIndex += 1;
    }
  }

  yield done(array);
}

function* randomizedQuickSort(input: number[]): Generator<SortStep> {
  const array = clone(input);

  function* sort(low: number, high: number): Generator<SortStep> {
    if (low >= high) {
      return;
    }

    const pivotIndex = low + Math.floor(Math.random() * (high - low + 1));
    [array[pivotIndex], array[high]] = [array[high], array[pivotIndex]];
    yield { type: "swap", indices: [pivotIndex, high], array: clone(array) };

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
    yield* sort(low, cursor - 1);
    yield* sort(cursor + 1, high);
  }

  yield* sort(0, array.length - 1);
  yield done(array);
}

function* blockQuickSort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "BlockQuicksort 用块缓冲减少分支误判；首版模拟分块 partition 后的结果。");
}

function* stableQuickSort(input: number[]): Generator<SortStep> {
  const sorted = clone(input)
    .map((value, index) => ({ value, index }))
    .sort((left, right) => left.value - right.value || left.index - right.index)
    .map((item) => item.value);
  yield { type: "message", text: "稳定快排通常需要额外空间维持相等元素顺序；首版用稳定写回演示。" };

  for (let index = 0; index < sorted.length; index += 1) {
    yield { type: "write", index, value: sorted[index], array: sorted.slice(0, index + 1) };
  }

  yield done(sorted);
}

function* parallelMergeSort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "并行归并排序会在多线程中拆分任务；浏览器演示只模拟任务完成后的合并。");
}

function* parallelQuickSort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "并行快速排序会把左右分区交给不同任务；首版不创建 worker，只模拟结果。");
}

function* gpuBitonicSort(input: number[], options: SortOptions): Generator<SortStep> {
  yield { type: "message", text: "GPU 双调排序依赖着色器或计算内核；这里复用受限双调网络演示。" };
  yield* bitonicSort(input, options);
}

function* mapreduceSort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "MapReduce 排序依赖 shuffle、partition 和 reducer；首版只模拟分布式排序结果。");
}

function* quantumBogoSort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "量子猴子排序是玩笑概念：把所有排列交给宇宙分支，首版只做图鉴模拟。");
}

function* bogobogoSort(input: number[], options: SortOptions): Generator<SortStep> {
  const array = clone(input).slice(0, Math.min(5, options.safety.maxArraySize));
  yield { type: "message", text: "Bogobogo 排序比猴子排序更危险，真实递归洗牌可能极久；首版强制小规模模拟。" };
  const sorted = clone(array).sort((left, right) => left - right);

  for (let index = 0; index < sorted.length; index += 1) {
    array[index] = sorted[index];
    yield { type: "write", index, value: sorted[index], array: clone(array) };
  }

  yield done(array);
}

function* deterministicSeedBogoSort(input: number[], options: SortOptions): Generator<SortStep> {
  let array = clone(input).slice(0, options.safety.maxArraySize);
  let seed = 17;
  let attempts = 0;
  yield { type: "message", text: "确定性种子猴子排序使用可复现伪随机洗牌，仍然必须限制规模。" };

  function nextRandom() {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  }

  while (!isSorted(array) && attempts < 80) {
    for (let index = array.length - 1; index > 0; index -= 1) {
      const target = Math.floor(nextRandom() * (index + 1));
      [array[index], array[target]] = [array[target], array[index]];
    }

    attempts += 1;
    yield { type: "shuffle", array: clone(array) };
  }

  if (!isSorted(array)) {
    yield { type: "aborted", reason: "确定性洗牌没有在限制内完成，已停止演示。" };
    return;
  }

  yield done(array);
}

function* permutationSort(input: number[], options: SortOptions): Generator<SortStep> {
  const array = clone(input).slice(0, options.safety.maxArraySize);
  yield { type: "message", text: "排列排序会枚举排列直到有序，真实运行极慢；这里仅做受限模拟。" };
  const sorted = clone(array).sort((left, right) => left - right);

  for (let index = 0; index < sorted.length; index += 1) {
    array[index] = sorted[index];
    yield { type: "write", index, value: sorted[index], array: clone(array) };
  }

  yield done(array);
}

function* randomSort(input: number[], options: SortOptions): Generator<SortStep> {
  let array = clone(input).slice(0, options.safety.maxArraySize);
  yield { type: "message", text: "Random Sort 随机换位直到有序，已限制尝试次数。" };

  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (isSorted(array)) {
      yield done(array);
      return;
    }

    const left = Math.floor(Math.random() * array.length);
    const right = Math.floor(Math.random() * array.length);
    [array[left], array[right]] = [array[right], array[left]];
    yield { type: "swap", indices: [left, right], array: clone(array) };
  }

  yield { type: "aborted", reason: "随机换位没有在限制内完成。" };
}

function* lasVegasSort(input: number[], options: SortOptions): Generator<SortStep> {
  let array = clone(input).slice(0, options.safety.maxArraySize);
  yield { type: "message", text: "Las Vegas 排序会随机尝试但必须验证正确性；这里限制尝试次数。" };

  for (let attempt = 0; attempt < 80; attempt += 1) {
    array = shuffle(array);
    yield { type: "shuffle", array: clone(array) };

    if (isSorted(array)) {
      yield done(array);
      return;
    }
  }

  const sorted = clone(array).sort((left, right) => left - right);
  yield { type: "message", text: "随机尝试未命中，切换到模拟写回。" };

  for (let index = 0; index < sorted.length; index += 1) {
    array[index] = sorted[index];
    yield { type: "write", index, value: sorted[index], array: clone(array) };
  }

  yield done(array);
}

function* monteCarloSort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "Monte Carlo 排序允许概率性答案；Sorting Zoo 不输出错误结果，只做概念模拟。");
}

function* guessSort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "Guess Sort 靠猜测有序排列；首版直接展示猜中后的结果。");
}

function* worstSort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "Worstsort 故意把排序复杂度放大，是危险玩笑算法；这里只做模拟。");
}

function* bestSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  yield { type: "message", text: "Best Sort 的玩笑设定是假设输入已经最好；若不是，首版模拟修正。" };

  if (isSorted(array)) {
    yield done(array);
    return;
  }

  const sorted = clone(array).sort((left, right) => left - right);

  for (let index = 0; index < sorted.length; index += 1) {
    array[index] = sorted[index];
    yield { type: "write", index, value: sorted[index], array: clone(array) };
  }

  yield done(array);
}

function* panicSort(input: number[]): Generator<SortStep> {
  yield { type: "message", text: "Panic Sort 是玩笑算法：发现无序就惊慌。Sorting Zoo 用模拟结果收尾。" };
  yield* writeSortedSimulation(input, "惊慌之后，还是把数组整理好给用户看。");
}

function* annealingSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  yield { type: "message", text: "退火排序用随机邻域搜索逼近有序，首版演示少量随机交换后写回。" };

  for (let step = 0; step < Math.min(12, array.length * 2); step += 1) {
    const left = Math.floor(Math.random() * array.length);
    const right = Math.floor(Math.random() * array.length);
    yield { type: "compare", indices: [left, right] };

    if (array[left] > array[right]) {
      [array[left], array[right]] = [array[right], array[left]];
      yield { type: "swap", indices: [left, right], array: clone(array) };
    }
  }

  const sorted = clone(array).sort((left, right) => left - right);

  for (let index = 0; index < sorted.length; index += 1) {
    array[index] = sorted[index];
    yield { type: "write", index, value: sorted[index], array: clone(array) };
  }

  yield done(array);
}

function* geneticSort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "遗传排序会演化排列种群，真实过程开销大且不稳定；首版模拟最优个体。");
}

function* neuralSort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "NeuralSort 通常指可微排序近似，不是传统确定排序；首版做概念模拟。");
}

function* quantumSort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "量子排序属于理论/概念图鉴条目；网页内不模拟量子态，只展示结果。");
}

function* entropySort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "Entropy Sort 按信息熵/不确定性叙事组织比较；首版做图鉴模拟。");
}

function* timeSort(input: number[], options: SortOptions): Generator<SortStep> {
  yield { type: "message", text: "Time Sort 类似 Sleep Sort 的时间隐喻；不创建真实计时器风暴，只模拟。" };
  yield* sleepSort(input, options);
}

function* calendarSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  const buckets = new Map<number, number[]>();
  yield { type: "message", text: "Calendar Sort 按时间/日期桶分组；数字数组里用模桶模拟日历格。" };

  for (let index = 0; index < array.length; index += 1) {
    const key = array[index] % 12;
    const bucket = buckets.get(key) ?? [];
    bucket.push(array[index]);
    buckets.set(key, bucket);
    yield { type: "mark", indices: [index], role: "candidate" };
  }

  const sorted = [...buckets.values()].flat().sort((left, right) => left - right);

  for (let index = 0; index < sorted.length; index += 1) {
    array[index] = sorted[index];
    yield { type: "write", index, value: sorted[index], array: clone(array) };
  }

  yield done(array);
}

function* postOfficeSort(input: number[]): Generator<SortStep> {
  yield* postmanSort(input);
}

function* lexicographicSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  const sorted = clone(input).sort((left, right) => String(left).localeCompare(String(right)));
  yield { type: "message", text: "字典序排序按文本形式比较，因此 10 可能排在 2 前面。" };

  for (let index = 0; index < sorted.length; index += 1) {
    array[index] = sorted[index];
    yield { type: "write", index, value: sorted[index], array: clone(array) };
  }

  yield done(array);
}

function* shortlexSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  const sorted = clone(input).sort((left, right) => {
    const leftText = String(left);
    const rightText = String(right);
    return leftText.length - rightText.length || leftText.localeCompare(rightText);
  });
  yield { type: "message", text: "Shortlex 先按字符串长度，再按字典序排序。" };

  for (let index = 0; index < sorted.length; index += 1) {
    array[index] = sorted[index];
    yield { type: "write", index, value: sorted[index], array: clone(array) };
  }

  yield done(array);
}

function* partialSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  const count = Math.max(1, Math.floor(array.length / 2));
  const sortedPrefix = clone(input).sort((left, right) => left - right).slice(0, count);
  yield { type: "message", text: `Partial Sort 只保证前 ${count} 个元素有序，其余元素不承诺全序。` };

  for (let index = 0; index < sortedPrefix.length; index += 1) {
    array[index] = sortedPrefix[index];
    yield { type: "write", index, value: sortedPrefix[index], array: clone(array) };
  }

  yield done(array);
}

function* nthElementSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  const sorted = clone(input).sort((left, right) => left - right);
  const nth = Math.floor(array.length / 2);
  yield { type: "message", text: `nth_element 只保证第 ${nth + 1} 小元素归位，两侧满足分区关系。` };

  array[nth] = sorted[nth];
  yield { type: "write", index: nth, value: sorted[nth], array: clone(array) };

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

function* exchangeSort(input: number[]): Generator<SortStep> {
  const array = clone(input);

  for (let left = 0; left < array.length - 1; left += 1) {
    for (let right = left + 1; right < array.length; right += 1) {
      yield { type: "compare", indices: [left, right] };

      if (array[left] > array[right]) {
        [array[left], array[right]] = [array[right], array[left]];
        yield { type: "swap", indices: [left, right], array: clone(array) };
      }
    }

    yield { type: "mark", indices: [left], role: "sorted" };
  }

  yield done(array);
}

function* interpolationSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  const minimum = Math.min(...array);
  const maximum = Math.max(...array);
  const bucketCount = Math.max(2, Math.floor(Math.sqrt(array.length)));
  const buckets: number[][] = Array.from({ length: bucketCount }, () => []);

  yield { type: "message", text: "插值排序按值域位置预测桶位；分布越均匀越适合。" };

  for (let index = 0; index < array.length; index += 1) {
    const ratio = (array[index] - minimum) / Math.max(1, maximum - minimum);
    const bucketIndex = Math.min(bucketCount - 1, Math.floor(ratio * bucketCount));
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

function* histogramSort(input: number[]): Generator<SortStep> {
  yield { type: "message", text: "直方图排序按值域统计频次；这里复用计数排序式演示。" };
  yield* countingSort(input);
}

function* radixExchangeSort(input: number[]): Generator<SortStep> {
  const array = clone(input);
  const maximum = Math.max(...array, 0);
  let bit = 1;

  while (bit <= maximum) {
    bit <<= 1;
  }

  bit >>= 1;

  function* partition(left: number, right: number, mask: number): Generator<SortStep> {
    if (left >= right || mask === 0) {
      return;
    }

    let low = left;
    let high = right;
    yield { type: "message", text: `按二进制位 ${mask} 分区。` };

    while (low <= high) {
      while (low <= high && (array[low] & mask) === 0) {
        yield { type: "compare", indices: [low, high] };
        low += 1;
      }

      while (low <= high && (array[high] & mask) !== 0) {
        yield { type: "compare", indices: [low, high] };
        high -= 1;
      }

      if (low < high) {
        [array[low], array[high]] = [array[high], array[low]];
        yield { type: "swap", indices: [low, high], array: clone(array) };
        low += 1;
        high -= 1;
      }
    }

    yield* partition(left, high, mask >> 1);
    yield* partition(low, right, mask >> 1);
  }

  yield* partition(0, array.length - 1, bit);
  yield done(array);
}

function* simulatedCatalogSort(input: number[], message: string): Generator<SortStep> {
  yield* writeSortedSimulation(input, message);
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
  "in-place-merge-sort": {
    meta: metaFor("in-place-merge-sort"),
    code: `function inPlaceMergeSort(array) {
  splitRecursively(array);
  mergeByShiftingInsideTheSameArray(array);
  return array;
}`,
    generateSteps: inPlaceMergeSort,
  },
  "block-merge-sort": {
    meta: metaFor("block-merge-sort"),
    code: `function blockMergeSort(array) {
  sortSmallBlocks(array);
  mergeBlocksWithInternalBuffer(array);
  return array;
}`,
    generateSteps: blockMergeSort,
  },
  "weave-merge-sort": {
    meta: metaFor("weave-merge-sort"),
    code: `function weaveMergeSort(array) {
  const left = sort(valuesAtEvenPositions(array));
  const right = sort(valuesAtOddPositions(array));
  return weaveMerge(left, right);
}`,
    generateSteps: weaveMergeSort,
  },
  "smooth-sort": {
    meta: metaFor("smooth-sort"),
    code: `function smoothSort(array) {
  buildLeonardoHeaps(array);
  repeatedlyExtractLargest(array);
  return array;
}`,
    generateSteps: smoothSort,
  },
  "weak-heap-sort": {
    meta: metaFor("weak-heap-sort"),
    code: `function weakHeapSort(array) {
  buildWeakHeap(array);
  sortDownWithWeakHeap(array);
  return array;
}`,
    generateSteps: weakHeapSort,
  },
  "cartesian-tree-sort": {
    meta: metaFor("cartesian-tree-sort"),
    code: `function cartesianTreeSort(array) {
  const tree = buildCartesianTree(array);
  return repeatedlyDeleteMinimum(tree);
}`,
    generateSteps: cartesianTreeSort,
  },
  "flash-sort": {
    meta: metaFor("flash-sort"),
    code: `function flashSort(array) {
  classifyByValueRange(array);
  permuteValuesIntoClasses(array);
  insertionSortInsideClasses(array);
  return array;
}`,
    generateSteps: flashSort,
  },
  "spread-sort": {
    meta: metaFor("spread-sort"),
    code: `function spreadSort(array) {
  spreadValuesIntoIntegerBuckets(array);
  recursivelySortBuckets(array);
  return array;
}`,
    generateSteps: spreadSort,
  },
  "proxmap-sort": {
    meta: metaFor("proxmap-sort"),
    code: `function proxmapSort(array) {
  mapEachValueToApproximateFinalRegion(array);
  insertionSortEachRegion(array);
  return compactRegions(array);
}`,
    generateSteps: proxmapSort,
  },
  "postman-sort": {
    meta: metaFor("postman-sort"),
    code: `function postmanSort(array) {
  for (const digit of addressDigits(array)) {
    deliverValuesIntoDigitBuckets(array, digit);
  }
  return array;
}`,
    generateSteps: postmanSort,
  },
  "burstsort": {
    meta: metaFor("burstsort"),
    code: `function burstsort(strings) {
  insertIntoTrieBuckets(strings);
  burstLargeBucketsIntoDeeperNodes();
  return traverseTrieBuckets();
}`,
    generateSteps: burstsort,
  },
  "sample-sort": {
    meta: metaFor("sample-sort"),
    code: `function sampleSort(array) {
  const splitters = chooseSamplePivots(array);
  const buckets = partitionBySplitters(array, splitters);
  return buckets.flatMap(sort);
}`,
    generateSteps: sampleSort,
  },
  "bitonic-sort": {
    meta: metaFor("bitonic-sort"),
    code: `function bitonicSort(array) {
  buildBitonicSequence(array);
  bitonicMerge(array, ascending);
  return array;
}`,
    generateSteps: bitonicSort,
  },
  "odd-even-merge-sort": {
    meta: metaFor("odd-even-merge-sort"),
    code: `function oddEvenMergeSort(array) {
  recursivelySortHalves(array);
  oddEvenMergeNetwork(array);
  return array;
}`,
    generateSteps: oddEvenMergeSort,
  },
  "pairwise-sorting-network": {
    meta: metaFor("pairwise-sorting-network"),
    code: `function pairwiseSortingNetwork(array) {
  for (const layer of fixedPairwiseLayers(array.length)) {
    compareExchangeAllPairs(array, layer);
  }
  return array;
}`,
    generateSteps: pairwiseSortingNetwork,
  },
  "rank-sort": {
    meta: metaFor("rank-sort"),
    code: `function rankSort(array) {
  for (const value of array) {
    output[countValuesSmallerThan(value)] = value;
  }
  return output;
}`,
    generateSteps: rankSort,
  },
  "brick-sort": {
    meta: metaFor("brick-sort"),
    code: `function brickSort(array) {
  while (!sorted) {
    compareOddPairs(array);
    compareEvenPairs(array);
  }
  return array;
}`,
    generateSteps: brickSort,
  },
  "circle-sort": {
    meta: metaFor("circle-sort"),
    code: `function circleSort(array) {
  do {
    changed = compareOuterPairsThenRecurse(array);
  } while (changed);
  return array;
}`,
    generateSteps: circleSort,
  },
  "cycle-leader-sort": {
    meta: metaFor("cycle-leader-sort"),
    code: `function cycleLeaderSort(array) {
  const permutation = finalSortedPermutation(array);
  rotateEachPermutationCycle(array, permutation);
  return array;
}`,
    generateSteps: cycleLeaderSort,
  },
  "drop-merge-sort": {
    meta: metaFor("drop-merge-sort"),
    code: `function dropMergeSort(array) {
  for (const value of array) {
    if (keepsMergeOrder(value)) output.push(value);
    else drop(value);
  }
  return output;
}`,
    generateSteps: dropMergeSort,
  },
  "quickselect-sort": {
    meta: metaFor("quickselect-sort"),
    code: `function quickselectSort(array) {
  for (let k = 0; k < array.length; k++) {
    output[k] = quickselect(array, k);
  }
  return output;
}`,
    generateSteps: quickselectSort,
  },
  "median-of-three-quick-sort": {
    meta: metaFor("median-of-three-quick-sort"),
    code: `function medianOfThreeQuickSort(array) {
  const pivot = medianOf(first, middle, last);
  partitionAroundPivot(array, pivot);
  recursivelySortPartitions(array);
  return array;
}`,
    generateSteps: medianOfThreeQuickSort,
  },
  "ternary-heap-sort": {
    meta: metaFor("ternary-heap-sort"),
    code: `function ternaryHeapSort(array) {
  buildThreeAryMaxHeap(array);
  repeatedlyMoveRootToEnd(array);
  return array;
}`,
    generateSteps: ternaryHeapSort,
  },
  "binomial-heap-sort": {
    meta: metaFor("binomial-heap-sort"),
    code: `function binomialHeapSort(array) {
  const heap = buildBinomialHeap(array);
  return repeatedlyExtractMin(heap);
}`,
    generateSteps: binomialHeapSort,
  },
  "pairing-heap-sort": {
    meta: metaFor("pairing-heap-sort"),
    code: `function pairingHeapSort(array) {
  const heap = buildPairingHeap(array);
  return repeatedlyExtractMin(heap);
}`,
    generateSteps: pairingHeapSort,
  },
  "cube-sort": {
    meta: metaFor("cube-sort"),
    code: `function cubeSort(array) {
  detectRuns(array);
  mergeRunsWithCubesortStrategy(array);
  return array;
}`,
    generateSteps: cubeSort,
  },
  "quad-sort": {
    meta: metaFor("quad-sort"),
    code: `function quadSort(array) {
  sortSmallQuads(array);
  parityMergeBlocks(array);
  return array;
}`,
    generateSteps: quadSort,
  },
  "grail-sort": {
    meta: metaFor("grail-sort"),
    code: `function grailSort(array) {
  chooseInternalBuffer(array);
  stableBlockMergeInPlace(array);
  return array;
}`,
    generateSteps: grailSort,
  },
  "wiki-sort": {
    meta: metaFor("wiki-sort"),
    code: `function wikiSort(array) {
  findKeysAndBuffer(array);
  stableBlockMerge(array);
  return array;
}`,
    generateSteps: wikiSort,
  },
  "flux-sort": {
    meta: metaFor("flux-sort"),
    code: `function fluxSort(array) {
  analyzeDistribution(array);
  choosePartitionOrMergeStrategy(array);
  return array;
}`,
    generateSteps: fluxSort,
  },
  "pdq-sort": {
    meta: metaFor("pdq-sort"),
    code: `function pdqSort(array) {
  quicksortWithPatternDetection(array);
  breakBadPatternsOrFallback(array);
  return array;
}`,
    generateSteps: pdqSort,
  },
  "power-sort": {
    meta: metaFor("power-sort"),
    code: `function powerSort(array) {
  detectRuns(array);
  mergeByNodePowerInvariant(array);
  return array;
}`,
    generateSteps: powerSort,
  },
  "shivers-sort": {
    meta: metaFor("shivers-sort"),
    code: `function shiversSort(array) {
  detectRuns(array);
  mergeRunsByShiversStackRule(array);
  return array;
}`,
    generateSteps: shiversSort,
  },
  "merge-insertion-sort": {
    meta: metaFor("merge-insertion-sort"),
    code: `function mergeInsertionSort(array) {
  pairItemsAndSortLargerValues(array);
  insertSmallerValuesByJacobsthalOrder(array);
  return array;
}`,
    generateSteps: mergeInsertionSort,
  },
  "splay-sort": {
    meta: metaFor("splay-sort"),
    code: `function splaySort(array) {
  const tree = buildSplayTree(array);
  return inorderTraversal(tree);
}`,
    generateSteps: splaySort,
  },
  "treap-sort": {
    meta: metaFor("treap-sort"),
    code: `function treapSort(array) {
  const treap = insertByKeyAndPriority(array);
  return inorderTraversal(treap);
}`,
    generateSteps: treapSort,
  },
  "patience-merge-sort": {
    meta: metaFor("patience-merge-sort"),
    code: `function patienceMergeSort(array) {
  const piles = dealIntoPatiencePiles(array);
  return mergePileTopsWithPriorityQueue(piles);
}`,
    generateSteps: patienceMergeSort,
  },
  "library-insertion-sort": {
    meta: metaFor("library-insertion-sort"),
    code: `function libraryInsertionSort(array) {
  insertIntoGappedShelf(array);
  rebalanceShelfWhenCrowded(array);
  return compactShelf(array);
}`,
    generateSteps: libraryInsertionSort,
  },
  "replacement-selection-sort": {
    meta: metaFor("replacement-selection-sort"),
    code: `function replacementSelectionSort(stream) {
  const runs = generateRunsWithPriorityQueue(stream);
  return multiwayMerge(runs);
}`,
    generateSteps: replacementSelectionSort,
  },
  "balanced-merge-sort": {
    meta: metaFor("balanced-merge-sort"),
    code: `function balancedMergeSort(runs) {
  distributeRunsAcrossTapes(runs);
  return balancedMultiwayMerge(runs);
}`,
    generateSteps: balancedMergeSort,
  },
  "external-merge-sort": {
    meta: metaFor("external-merge-sort"),
    code: `function externalMergeSort(files) {
  const runs = createSortedRuns(files);
  return mergeRunsFromDisk(runs);
}`,
    generateSteps: externalMergeSort,
  },
  "multiway-merge-sort": {
    meta: metaFor("multiway-merge-sort"),
    code: `function multiwayMergeSort(runs) {
  const heap = initializeRunHeap(runs);
  return repeatedlyTakeSmallest(heap);
}`,
    generateSteps: multiwayMergeSort,
  },
  "polyphase-merge-sort": {
    meta: metaFor("polyphase-merge-sort"),
    code: `function polyphaseMergeSort(runs) {
  distributeRunsByFibonacciCounts(runs);
  return mergeAcrossTapePhases(runs);
}`,
    generateSteps: polyphaseMergeSort,
  },
  "cascade-merge-sort": {
    meta: metaFor("cascade-merge-sort"),
    code: `function cascadeMergeSort(runs) {
  cascadeRunsThroughMergeLevels(runs);
  return finalMergedRun(runs);
}`,
    generateSteps: cascadeMergeSort,
  },
  "distribution-sort": {
    meta: metaFor("distribution-sort"),
    code: `function distributionSort(array) {
  const buckets = distributeByKeyRange(array);
  sortEachBucket(buckets);
  return concatenateBuckets(buckets);
}`,
    generateSteps: distributionSort,
  },
  "integer-sort": {
    meta: metaFor("integer-sort"),
    code: `function integerSort(array) {
  countOrBucketIntegerKeys(array);
  writeBackInIntegerOrder(array);
  return array;
}`,
    generateSteps: integerSort,
  },
  "tag-sort": {
    meta: metaFor("tag-sort"),
    code: `function tagSort(records) {
  const tags = records.map((record, index) => ({ key: record.key, index }));
  sortTags(tags);
  return readRecordsByTagOrder(records, tags);
}`,
    generateSteps: tagSort,
  },
  "address-calculation-sort": {
    meta: metaFor("address-calculation-sort"),
    code: `function addressCalculationSort(array) {
  mapValuesToApproximateAddresses(array);
  insertIntoAddressBuckets(array);
  return compactBuckets(array);
}`,
    generateSteps: addressCalculationSort,
  },
  "topological-sort-as-sorting": {
    meta: metaFor("topological-sort-as-sorting"),
    code: `function topologicalSortAsSorting(items, edges) {
  return topologicalOrderOfDependencyGraph(items, edges);
}`,
    generateSteps: topologicalSortAsSorting,
  },
  "bitset-sort": {
    meta: metaFor("bitset-sort"),
    code: `function bitsetSort(array) {
  markSeenValuesInBitset(array);
  return readSetBitsInOrder();
}`,
    generateSteps: bitsetSort,
  },
  "randomized-quick-sort": {
    meta: metaFor("randomized-quick-sort"),
    code: `function randomizedQuickSort(array) {
  const pivot = chooseRandomPivot(array);
  partitionAndRecurse(array, pivot);
  return array;
}`,
    generateSteps: randomizedQuickSort,
  },
  "block-quick-sort": {
    meta: metaFor("block-quick-sort"),
    code: `function blockQuickSort(array) {
  partitionUsingBlockBuffers(array);
  recurseOrFallback(array);
  return array;
}`,
    generateSteps: blockQuickSort,
  },
  "stable-quick-sort": {
    meta: metaFor("stable-quick-sort"),
    code: `function stableQuickSort(array) {
  const lessEqualGreater = stablePartition(array);
  return concatenateSortedPartitions(lessEqualGreater);
}`,
    generateSteps: stableQuickSort,
  },
  "parallel-merge-sort": {
    meta: metaFor("parallel-merge-sort"),
    code: `function parallelMergeSort(array) {
  spawnSortTasksForHalves(array);
  parallelMergeResults(array);
  return array;
}`,
    generateSteps: parallelMergeSort,
  },
  "parallel-quick-sort": {
    meta: metaFor("parallel-quick-sort"),
    code: `function parallelQuickSort(array) {
  partition(array);
  sortPartitionsInParallel(array);
  return array;
}`,
    generateSteps: parallelQuickSort,
  },
  "gpu-bitonic-sort": {
    meta: metaFor("gpu-bitonic-sort"),
    code: `function gpuBitonicSort(buffer) {
  dispatchBitonicCompareExchangeKernels(buffer);
  return readBackSortedBuffer(buffer);
}`,
    generateSteps: gpuBitonicSort,
  },
  "mapreduce-sort": {
    meta: metaFor("mapreduce-sort"),
    code: `function mapreduceSort(records) {
  mapToPartitionedKeyValuePairs(records);
  shuffleByKeyRange(records);
  return reduceSortedPartitions(records);
}`,
    generateSteps: mapreduceSort,
  },
  "quantum-bogo-sort": {
    meta: metaFor("quantum-bogo-sort"),
    code: `function quantumBogoSort(array) {
  splitUniverseIntoEveryPermutation(array);
  return observeUniverseWhereArrayIsSorted();
}`,
    generateSteps: quantumBogoSort,
  },
  "bogobogo-sort": {
    meta: metaFor("bogobogo-sort"),
    code: `function bogobogoSort(array) {
  recursivelyBogosortPrefixes(array);
  shuffleEverythingWhenPrefixFails(array);
  return array;
}`,
    generateSteps: bogobogoSort,
  },
  "bogosort-deterministic-seed": {
    meta: metaFor("bogosort-deterministic-seed"),
    code: `function deterministicSeedBogoSort(array, seed) {
  while (!isSorted(array)) {
    shuffleWithSeed(array, seed);
  }
  return array;
}`,
    generateSteps: deterministicSeedBogoSort,
  },
  "permutation-sort": {
    meta: metaFor("permutation-sort"),
    code: `function permutationSort(array) {
  for (const permutation of everyPermutation(array)) {
    if (isSorted(permutation)) return permutation;
  }
}`,
    generateSteps: permutationSort,
  },
  "random-sort": {
    meta: metaFor("random-sort"),
    code: `function randomSort(array) {
  while (!isSorted(array)) {
    swapTwoRandomItems(array);
  }
  return array;
}`,
    generateSteps: randomSort,
  },
  "las-vegas-sort": {
    meta: metaFor("las-vegas-sort"),
    code: `function lasVegasSort(array) {
  do {
    shuffle(array);
  } while (!verifySorted(array));
  return array;
}`,
    generateSteps: lasVegasSort,
  },
  "monte-carlo-sort": {
    meta: metaFor("monte-carlo-sort"),
    code: `function monteCarloSort(array) {
  const candidate = probabilisticSortAttempt(array);
  return candidateLikelySorted(candidate) ? candidate : retryOrReportUncertainty();
}`,
    generateSteps: monteCarloSort,
  },
  "guess-sort": {
    meta: metaFor("guess-sort"),
    code: `function guessSort(array) {
  const guess = guessSortedPermutation(array);
  return verify(guess) ? guess : tryAgain();
}`,
    generateSteps: guessSort,
  },
  "worstsort": {
    meta: metaFor("worstsort"),
    code: `function worstsort(array) {
  intentionallyMakeSortingAsBadAsPossible(array);
  return eventuallySort(array);
}`,
    generateSteps: worstSort,
  },
  "best-sort": {
    meta: metaFor("best-sort"),
    code: `function bestSort(array) {
  if (isAlreadyBest(array)) return array;
  return explainWhyInputShouldHaveBeenSorted();
}`,
    generateSteps: bestSort,
  },
  "panic-sort": {
    meta: metaFor("panic-sort"),
    code: `function panicSort(array) {
  if (!isSorted(array)) panic();
  return recoverAndSort(array);
}`,
    generateSteps: panicSort,
  },
  "annealing-sort": {
    meta: metaFor("annealing-sort"),
    code: `function annealingSort(array) {
  while (temperature > 0) {
    maybeAcceptRandomSwap(array, temperature);
    coolDown();
  }
  return array;
}`,
    generateSteps: annealingSort,
  },
  "genetic-sort": {
    meta: metaFor("genetic-sort"),
    code: `function geneticSort(array) {
  let population = randomPermutations(array);
  evolveUntilSorted(population);
  return bestIndividual(population);
}`,
    generateSteps: geneticSort,
  },
  "neural-sort": {
    meta: metaFor("neural-sort"),
    code: `function neuralSort(array) {
  const softPermutation = differentiableSortingNetwork(array);
  return discretize(softPermutation);
}`,
    generateSteps: neuralSort,
  },
  "quantum-sort": {
    meta: metaFor("quantum-sort"),
    code: `function quantumSort(array) {
  prepareQuantumState(array);
  observeSortedOutcome();
  return sortedClassicalResult(array);
}`,
    generateSteps: quantumSort,
  },
  "entropy-sort": {
    meta: metaFor("entropy-sort"),
    code: `function entropySort(array) {
  chooseComparisonsThatReduceUncertainty(array);
  return sorted(array);
}`,
    generateSteps: entropySort,
  },
  "time-sort": {
    meta: metaFor("time-sort"),
    code: `function timeSort(array) {
  scheduleEachValueByTime(array);
  return collectInTimerOrder();
}`,
    generateSteps: timeSort,
  },
  "calendar-sort": {
    meta: metaFor("calendar-sort"),
    code: `function calendarSort(array) {
  bucketByCalendarSlot(array);
  sortInsideSlots(array);
  return flattenCalendar(array);
}`,
    generateSteps: calendarSort,
  },
  "post-office-sort": {
    meta: metaFor("post-office-sort"),
    code: `function postOfficeSort(array) {
  routeItemsByAddressDigits(array);
  collectRoutesInAddressOrder(array);
  return array;
}`,
    generateSteps: postOfficeSort,
  },
  "lexicographic-sort": {
    meta: metaFor("lexicographic-sort"),
    code: `function lexicographicSort(array) {
  return array.sort((a, b) => String(a).localeCompare(String(b)));
}`,
    generateSteps: lexicographicSort,
  },
  "shortlex-sort": {
    meta: metaFor("shortlex-sort"),
    code: `function shortlexSort(array) {
  return array.sort(byLengthThenLexicographicOrder);
}`,
    generateSteps: shortlexSort,
  },
  "partial-sort": {
    meta: metaFor("partial-sort"),
    code: `function partialSort(array, count) {
  sortOnlyTheSmallestPrefix(array, count);
  return array;
}`,
    generateSteps: partialSort,
  },
  "nth-element-sort": {
    meta: metaFor("nth-element-sort"),
    code: `function nthElementSort(array, n) {
  quickselectNthIntoPlace(array, n);
  partitionAroundNth(array, n);
  return array;
}`,
    generateSteps: nthElementSort,
  },
  "aks-sorting-network": {
    meta: metaFor("aks-sorting-network"),
    code: `function aksSortingNetwork(array) {
  const network = theoreticalAksNetwork(array.length);
  return applyComparatorNetwork(array, network);
}
// Sorting Zoo 只做图鉴模拟，不展开巨大理论网络。`,
    generateSteps: (input) => simulatedCatalogSort(input, "AKS 排序网络常数极大，首版不真实展开比较网络，只展示理论条目结果。"),
  },
  "alpha-merge-sort": {
    meta: metaFor("alpha-merge-sort"),
    code: `function alphaMergeSort(array) {
  const runs = detectNaturalRuns(array);
  return mergeRunsByAlphaPolicy(runs);
}`,
    generateSteps: (input) => simulatedCatalogSort(input, "Alpha Merge Sort 属于自适应归并策略，首版以图鉴模拟方式展示。"),
  },
  "alpha-stack-sort": {
    meta: metaFor("alpha-stack-sort"),
    code: `function alphaStackSort(array) {
  const stack = pushNaturalRuns(array);
  enforceAlphaStackInvariant(stack);
  return collapseRuns(stack);
}`,
    generateSteps: (input) => simulatedCatalogSort(input, "Alpha Stack Sort 依赖 run 栈不变量，首版保留为自适应归并图鉴。"),
  },
  "binar-sort": {
    meta: metaFor("binar-sort"),
    code: `function binarSort(array) {
  classifyByBinarRule(array);
  return collectClassifiedValues(array);
}
// 冷门资料条目，首版只做概念展示。`,
    generateSteps: (input) => simulatedCatalogSort(input, "Binar Sort 公开资料分散，首版只做目录级模拟。"),
  },
  "burnt-pancake-sort": {
    meta: metaFor("burnt-pancake-sort"),
    code: `function burntPancakeSort(stack) {
  while (!isSortedAndRightSideUp(stack)) {
    flipPrefixAndToggleSides(stack);
  }
  return stack;
}`,
    generateSteps: (input) => simulatedCatalogSort(input, "烤焦煎饼排序需要表示正反面；数字数组中只模拟翻面排序结果。"),
  },
  "cache-conscious-burstsort": {
    meta: metaFor("cache-conscious-burstsort"),
    code: `function cacheConsciousBurstsort(strings) {
  insertIntoCacheFriendlyBurstTrie(strings);
  burstOversizedBuckets();
  return traverseBuckets();
}`,
    generateSteps: (input) => simulatedCatalogSort(input, "缓存感知 Burstsort 面向字符串和缓存局部性，首版不真实构建 trie。"),
  },
  "columnsort": {
    meta: metaFor("columnsort"),
    code: `function columnsort(matrix) {
  repeatColumnAndRowSortPhases(matrix);
  return flatten(matrix);
}`,
    generateSteps: (input) => simulatedCatalogSort(input, "Columnsort 依赖矩阵形状和并行轮次，首版作为图鉴模拟。"),
  },
  "crum-sort": {
    meta: metaFor("crum-sort"),
    code: `function crumsort(array) {
  partitionWithEngineeringGuards(array);
  finishSmallPartitions(array);
  return array;
}`,
    generateSteps: (input) => simulatedCatalogSort(input, "Crumsort 是工程型快速排序变体，首版保留概念展示。"),
  },
  "exchange-sort": {
    meta: metaFor("exchange-sort"),
    code: `function exchangeSort(array) {
  for (let i = 0; i < array.length - 1; i++) {
    for (let j = i + 1; j < array.length; j++) {
      if (array[i] > array[j]) swap(array, i, j);
    }
  }
  return array;
}`,
    generateSteps: exchangeSort,
  },
  "funnel-sort": {
    meta: metaFor("funnel-sort"),
    code: `function funnelsort(array) {
  const funnels = buildCacheObliviousFunnels(array);
  return mergeThroughFunnels(funnels);
}`,
    generateSteps: (input) => simulatedCatalogSort(input, "Funnelsort 的缓存无关漏斗结构复杂，首版只做图鉴模拟。"),
  },
  "hash-sort": {
    meta: metaFor("hash-sort"),
    code: `function hashSort(array) {
  const buckets = hashValuesIntoBuckets(array);
  resolveCollisionsInsideBuckets(buckets);
  return concatenateBuckets(buckets);
}`,
    generateSteps: (input) => simulatedCatalogSort(input, "Hash Sort 依赖哈希分布和冲突处理，首版用安全模拟收尾。"),
  },
  "histogram-sort": {
    meta: metaFor("histogram-sort"),
    code: `function histogramSort(array) {
  const histogram = countFrequencies(array);
  return expandHistogram(histogram);
}`,
    generateSteps: histogramSort,
  },
  "intelligent-design-sort": {
    meta: metaFor("intelligent-design-sort"),
    code: `function intelligentDesignSort(array) {
  assumeInputWasDesignedSorted(array);
  return array;
}
// 玩笑算法：不适合真实排序。`,
    generateSteps: (input) => simulatedCatalogSort(input, "智能设计排序声称输入本来就有序；Sorting Zoo 只做玩笑图鉴模拟。"),
  },
  "interpolation-sort": {
    meta: metaFor("interpolation-sort"),
    code: `function interpolationSort(array) {
  const buckets = placeByInterpolatedPosition(array);
  insertionSortEachBucket(buckets);
  return concatenateBuckets(buckets);
}`,
    generateSteps: interpolationSort,
  },
  "msd-string-radix-sort": {
    meta: metaFor("msd-string-radix-sort"),
    code: `function msdStringRadixSort(strings, depth = 0) {
  const buckets = bucketByCharacter(strings, depth);
  return recursivelyCollectBuckets(buckets, depth + 1);
}`,
    generateSteps: (input) => simulatedCatalogSort(input, "MSD 字符串基数排序面向字符串键，数字数组中只保留图鉴模拟。"),
  },
  "multikey-quick-sort": {
    meta: metaFor("multikey-quick-sort"),
    code: `function multikeyQuickSort(strings, depth = 0) {
  partitionByCharacter(strings, depth);
  recurseLessEqualGreaterParts(strings, depth);
  return strings;
}`,
    generateSteps: (input) => simulatedCatalogSort(input, "Multikey Quicksort 是字符串三路快排，首版不把数字强行转成完整字符串专题。"),
  },
  "peek-sort": {
    meta: metaFor("peek-sort"),
    code: `function peeksort(array) {
  const runs = peekExistingRuns(array);
  return adaptiveMerge(runs);
}`,
    generateSteps: (input) => simulatedCatalogSort(input, "Peeksort 会探测已有 run 再自适应归并，首版做概念模拟。"),
  },
  "poplar-sort": {
    meta: metaFor("poplar-sort"),
    code: `function poplarSort(array) {
  const poplars = buildPoplarHeapForest(array);
  return drainPoplars(poplars);
}`,
    generateSteps: (input) => simulatedCatalogSort(input, "Poplar Sort 使用 poplar 堆结构，首版不展开冷门堆细节。"),
  },
  "quick-heap-sort": {
    meta: metaFor("quick-heap-sort"),
    code: `function quickHeapsort(array) {
  quickPartition(array);
  heapSelectRemainingPart(array);
  return array;
}`,
    generateSteps: (input) => simulatedCatalogSort(input, "QuickHeapsort 是快排与堆选择混合研究条目，首版模拟展示。"),
  },
  "quick-merge-sort": {
    meta: metaFor("quick-merge-sort"),
    code: `function quickMergesort(array) {
  splitWithQuickPartition(array);
  mergeSortedRuns(array);
  return array;
}`,
    generateSteps: (input) => simulatedCatalogSort(input, "QuickMergesort 混合快速排序和归并策略，首版保留图鉴模拟。"),
  },
  "quick-weak-heap-sort": {
    meta: metaFor("quick-weak-heap-sort"),
    code: `function quickWeakHeapsort(array) {
  partitionThenWeakHeapSelect(array);
  return array;
}`,
    generateSteps: (input) => simulatedCatalogSort(input, "QuickWeakHeapsort 使用弱堆变体，首版只做安全模拟。"),
  },
  "radix-exchange-sort": {
    meta: metaFor("radix-exchange-sort"),
    code: `function radixExchangeSort(array, bit) {
  partitionByCurrentBit(array, bit);
  radixExchangeSort(leftPart, bit >> 1);
  radixExchangeSort(rightPart, bit >> 1);
  return array;
}`,
    generateSteps: radixExchangeSort,
  },
  "random-comparator-sort": {
    meta: metaFor("random-comparator-sort"),
    code: `function randomComparatorSort(array) {
  return array.sort(() => Math.random() - 0.5);
}
// 比较器不自洽，真实运行结果不可依赖。`,
    generateSteps: (input) => simulatedCatalogSort(input, "随机比较器违反排序比较契约，真实结果不可预测；这里只模拟安全结果。"),
  },
  "shearsort": {
    meta: metaFor("shearsort"),
    code: `function shearsort(matrix) {
  repeatSnakeRowSortsAndColumnSorts(matrix);
  return flatten(matrix);
}`,
    generateSteps: (input) => simulatedCatalogSort(input, "Shearsort 需要二维网格并行模型，首版只做图鉴模拟。"),
  },
  "shellsort-network": {
    meta: metaFor("shellsort-network"),
    code: `function shellsortNetwork(array) {
  for (const comparator of fixedShellComparators(array.length)) {
    compareExchange(array, comparator);
  }
  return array;
}`,
    generateSteps: (input) => simulatedCatalogSort(input, "Shellsort Network 要固定规模比较网络，首版不真实展开所有比较器。"),
  },
  "square-sort": {
    meta: metaFor("square-sort"),
    code: `function squareSort(array) {
  arrangeSquareRuns(array);
  mergeSquareRuns(array);
  return array;
}`,
    generateSteps: (input) => simulatedCatalogSort(input, "SquareSort 是较新的研究型条目，首版保留为图鉴模拟。"),
  },
  "twin-array-sort": {
    meta: metaFor("twin-array-sort"),
    code: `function twinArraySort(array) {
  const auxiliary = buildTwinArray(array);
  coordinateWrites(array, auxiliary);
  return array;
}`,
    generateSteps: (input) => simulatedCatalogSort(input, "Twin Array Sort 资料较冷门，首版只做目录级模拟。"),
  },
  "zig-zag-sort": {
    meta: metaFor("zig-zag-sort"),
    code: `function zigZagSort(array) {
  applyZigZagComparatorPattern(array);
  return array;
}`,
    generateSteps: (input) => simulatedCatalogSort(input, "Zig-zag Sort 属冷门网络/并行资料条目，首版图鉴模拟。"),
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
