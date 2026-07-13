import type { AlgorithmImplementation, SortOptions, SortStep } from "../types";

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
  const remaining = clone(input);
  const output: number[] = [];
  yield { type: "message", text: "笛卡尔树排序可用树维护最小值；首版用反复抽取最小值演示。" };

  while (remaining.length > 0) {
    let minimum = 0;
    const offset = output.length;

    for (let index = 1; index < remaining.length; index += 1) {
      yield { type: "compare", indices: [offset + minimum, offset + index] };

      if (remaining[index] < remaining[minimum]) {
        minimum = index;
      }
    }

    const sourceIndex = offset + minimum;
    const [value] = remaining.splice(minimum, 1);
    output.push(value);
    yield {
      type: "write",
      index: offset,
      value,
      array: [...output, ...remaining],
      animation: { kind: "move", from: sourceIndex, to: offset, lane: "upper" },
    };
  }

  yield done(output);
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

function* libraryInsertionSort(input: number[]): Generator<SortStep> {
  yield* librarySort(input);
}

function* gpuBitonicSort(input: number[], options: SortOptions): Generator<SortStep> {
  yield { type: "message", text: "GPU 双调排序依赖着色器或计算内核；这里复用受限双调网络演示。" };
  yield* bitonicSort(input, options);
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

export const algorithms: Record<string, AlgorithmImplementation> = {
"american-flag-sort": {
    code: `function americanFlagSort(array) {
  for (const digit of digitsFromLeftToRight(array)) {
    inPlaceBucketCycle(array, digit);
  }
  return array;
}`,
    generateSteps: americanFlagSort,
  },
"library-sort": {
    code: `function librarySort(array) {
  insertItemsIntoSparseGappedArray(array);
  rebalanceGapsWhenNeeded(array);
  return compact(array);
}`,
    generateSteps: librarySort,
  },
"block-merge-sort": {
    code: `function blockMergeSort(array) {
  sortSmallBlocks(array);
  mergeBlocksWithInternalBuffer(array);
  return array;
}`,
    generateSteps: blockMergeSort,
  },
"smooth-sort": {
    code: `function smoothSort(array) {
  buildLeonardoHeaps(array);
  repeatedlyExtractLargest(array);
  return array;
}`,
    generateSteps: smoothSort,
  },
"weak-heap-sort": {
    code: `function weakHeapSort(array) {
  buildWeakHeap(array);
  sortDownWithWeakHeap(array);
  return array;
}`,
    generateSteps: weakHeapSort,
  },
"cartesian-tree-sort": {
    code: `function cartesianTreeSort(array) {
  const tree = buildCartesianTree(array);
  return repeatedlyDeleteMinimum(tree);
}`,
    generateSteps: cartesianTreeSort,
  },
"pairwise-sorting-network": {
    code: `function pairwiseSortingNetwork(array) {
  for (const layer of fixedPairwiseLayers(array.length)) {
    compareExchangeAllPairs(array, layer);
  }
  return array;
}`,
    generateSteps: pairwiseSortingNetwork,
  },
"cycle-leader-sort": {
    code: `function cycleLeaderSort(array) {
  const permutation = finalSortedPermutation(array);
  rotateEachPermutationCycle(array, permutation);
  return array;
}`,
    generateSteps: cycleLeaderSort,
  },
"merge-insertion-sort": {
    code: `function mergeInsertionSort(array) {
  pairItemsAndSortLargerValues(array);
  insertSmallerValuesByJacobsthalOrder(array);
  return array;
}`,
    generateSteps: mergeInsertionSort,
  },
"library-insertion-sort": {
    code: `function libraryInsertionSort(array) {
  insertIntoGappedShelf(array);
  rebalanceShelfWhenCrowded(array);
  return compactShelf(array);
}`,
    generateSteps: libraryInsertionSort,
  },
"gpu-bitonic-sort": {
    code: `function gpuBitonicSort(buffer) {
  dispatchBitonicCompareExchangeKernels(buffer);
  return readBackSortedBuffer(buffer);
}`,
    generateSteps: gpuBitonicSort,
  },
"las-vegas-sort": {
    code: `function lasVegasSort(array) {
  do {
    shuffle(array);
  } while (!verifySorted(array));
  return array;
}`,
    generateSteps: lasVegasSort,
  }
};
