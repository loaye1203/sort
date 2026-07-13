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

function done(array: number[]): SortStep {
  return { type: "done", array: clone(array) };
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

function* splaySort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "伸展树排序会在访问时旋转节点；首版模拟树排序输出，不构造完整旋转动画。");
}

function* treapSort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "Treap 排序结合 BST 和随机优先级；首版模拟插入 treap 后中序输出。");
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

function* topologicalSortAsSorting(input: number[]): Generator<SortStep> {
  const sorted = clone(input).sort((left, right) => left - right);
  yield { type: "message", text: "拓扑排序不是普通数值排序；这里把 <= 关系当作 DAG 约束做图鉴模拟。" };

  for (let index = 0; index < sorted.length; index += 1) {
    yield { type: "write", index, value: sorted[index], array: sorted.slice(0, index + 1) };
  }

  yield done(sorted);
}

function* blockQuickSort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "BlockQuicksort 用块缓冲减少分支误判；首版模拟分块 partition 后的结果。");
}

function* parallelMergeSort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "并行归并排序会在多线程中拆分任务；浏览器演示只模拟任务完成后的合并。");
}

function* parallelQuickSort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "并行快速排序会把左右分区交给不同任务；首版不创建 worker，只模拟结果。");
}

function* mapreduceSort(input: number[]): Generator<SortStep> {
  yield* writeSortedSimulation(input, "MapReduce 排序依赖 shuffle、partition 和 reducer；首版只模拟分布式排序结果。");
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

function* histogramSort(input: number[]): Generator<SortStep> {
  yield { type: "message", text: "直方图排序按值域统计频次；这里复用计数排序式演示。" };
  yield* countingSort(input);
}

function* simulatedCatalogSort(input: number[], message: string): Generator<SortStep> {
  yield* writeSortedSimulation(input, message);
}

export const algorithms: Record<string, AlgorithmImplementation> = {
"bead-sort": {
    code: `function beadSort(array) {
  const beads = buildBeadGrid(array);
  let gravity move beads downward;
  return readRows(beads);
}`,
    generateSteps: beadSort,
  },
"spaghetti-sort": {
    code: `function spaghettiSort(array) {
  representValuesAsLengths(array);
  repeatedlyPullLongestLength();
  return reversePulledOrder();
}`,
    generateSteps: spaghettiSort,
  },
"slow-sort": {
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
"miracle-sort": {
    code: `function miracleSort(array) {
  while (!isSorted(array)) {
    waitForAMiracle();
  }
  return array;
}`,
    generateSteps: miracleSort,
  },
"burstsort": {
    code: `function burstsort(strings) {
  insertIntoTrieBuckets(strings);
  burstLargeBucketsIntoDeeperNodes();
  return traverseTrieBuckets();
}`,
    generateSteps: burstsort,
  },
"drop-merge-sort": {
    code: `function dropMergeSort(array) {
  for (const value of array) {
    if (keepsMergeOrder(value)) output.push(value);
    else drop(value);
  }
  return output;
}`,
    generateSteps: dropMergeSort,
  },
"binomial-heap-sort": {
    code: `function binomialHeapSort(array) {
  const heap = buildBinomialHeap(array);
  return repeatedlyExtractMin(heap);
}`,
    generateSteps: binomialHeapSort,
  },
"pairing-heap-sort": {
    code: `function pairingHeapSort(array) {
  const heap = buildPairingHeap(array);
  return repeatedlyExtractMin(heap);
}`,
    generateSteps: pairingHeapSort,
  },
"cube-sort": {
    code: `function cubeSort(array) {
  detectRuns(array);
  mergeRunsWithCubesortStrategy(array);
  return array;
}`,
    generateSteps: cubeSort,
  },
"quad-sort": {
    code: `function quadSort(array) {
  sortSmallQuads(array);
  parityMergeBlocks(array);
  return array;
}`,
    generateSteps: quadSort,
  },
"grail-sort": {
    code: `function grailSort(array) {
  chooseInternalBuffer(array);
  stableBlockMergeInPlace(array);
  return array;
}`,
    generateSteps: grailSort,
  },
"wiki-sort": {
    code: `function wikiSort(array) {
  findKeysAndBuffer(array);
  stableBlockMerge(array);
  return array;
}`,
    generateSteps: wikiSort,
  },
"flux-sort": {
    code: `function fluxSort(array) {
  analyzeDistribution(array);
  choosePartitionOrMergeStrategy(array);
  return array;
}`,
    generateSteps: fluxSort,
  },
"pdq-sort": {
    code: `function pdqSort(array) {
  quicksortWithPatternDetection(array);
  breakBadPatternsOrFallback(array);
  return array;
}`,
    generateSteps: pdqSort,
  },
"power-sort": {
    code: `function powerSort(array) {
  detectRuns(array);
  mergeByNodePowerInvariant(array);
  return array;
}`,
    generateSteps: powerSort,
  },
"shivers-sort": {
    code: `function shiversSort(array) {
  detectRuns(array);
  mergeRunsByShiversStackRule(array);
  return array;
}`,
    generateSteps: shiversSort,
  },
"splay-sort": {
    code: `function splaySort(array) {
  const tree = buildSplayTree(array);
  return inorderTraversal(tree);
}`,
    generateSteps: splaySort,
  },
"treap-sort": {
    code: `function treapSort(array) {
  const treap = insertByKeyAndPriority(array);
  return inorderTraversal(treap);
}`,
    generateSteps: treapSort,
  },
"replacement-selection-sort": {
    code: `function replacementSelectionSort(stream) {
  const runs = generateRunsWithPriorityQueue(stream);
  return multiwayMerge(runs);
}`,
    generateSteps: replacementSelectionSort,
  },
"balanced-merge-sort": {
    code: `function balancedMergeSort(runs) {
  distributeRunsAcrossTapes(runs);
  return balancedMultiwayMerge(runs);
}`,
    generateSteps: balancedMergeSort,
  },
"external-merge-sort": {
    code: `function externalMergeSort(files) {
  const runs = createSortedRuns(files);
  return mergeRunsFromDisk(runs);
}`,
    generateSteps: externalMergeSort,
  },
"multiway-merge-sort": {
    code: `function multiwayMergeSort(runs) {
  const heap = initializeRunHeap(runs);
  return repeatedlyTakeSmallest(heap);
}`,
    generateSteps: multiwayMergeSort,
  },
"polyphase-merge-sort": {
    code: `function polyphaseMergeSort(runs) {
  distributeRunsByFibonacciCounts(runs);
  return mergeAcrossTapePhases(runs);
}`,
    generateSteps: polyphaseMergeSort,
  },
"cascade-merge-sort": {
    code: `function cascadeMergeSort(runs) {
  cascadeRunsThroughMergeLevels(runs);
  return finalMergedRun(runs);
}`,
    generateSteps: cascadeMergeSort,
  },
"topological-sort-as-sorting": {
    code: `function topologicalSortAsSorting(items, edges) {
  return topologicalOrderOfDependencyGraph(items, edges);
}`,
    generateSteps: topologicalSortAsSorting,
  },
"block-quick-sort": {
    code: `function blockQuickSort(array) {
  partitionUsingBlockBuffers(array);
  recurseOrFallback(array);
  return array;
}`,
    generateSteps: blockQuickSort,
  },
"parallel-merge-sort": {
    code: `function parallelMergeSort(array) {
  spawnSortTasksForHalves(array);
  parallelMergeResults(array);
  return array;
}`,
    generateSteps: parallelMergeSort,
  },
"parallel-quick-sort": {
    code: `function parallelQuickSort(array) {
  partition(array);
  sortPartitionsInParallel(array);
  return array;
}`,
    generateSteps: parallelQuickSort,
  },
"mapreduce-sort": {
    code: `function mapreduceSort(records) {
  mapToPartitionedKeyValuePairs(records);
  shuffleByKeyRange(records);
  return reduceSortedPartitions(records);
}`,
    generateSteps: mapreduceSort,
  },
"bogobogo-sort": {
    code: `function bogobogoSort(array) {
  recursivelyBogosortPrefixes(array);
  shuffleEverythingWhenPrefixFails(array);
  return array;
}`,
    generateSteps: bogobogoSort,
  },
"permutation-sort": {
    code: `function permutationSort(array) {
  for (const permutation of everyPermutation(array)) {
    if (isSorted(permutation)) return permutation;
  }
}`,
    generateSteps: permutationSort,
  },
"monte-carlo-sort": {
    code: `function monteCarloSort(array) {
  const candidate = probabilisticSortAttempt(array);
  return candidateLikelySorted(candidate) ? candidate : retryOrReportUncertainty();
}`,
    generateSteps: monteCarloSort,
  },
"guess-sort": {
    code: `function guessSort(array) {
  const guess = guessSortedPermutation(array);
  return verify(guess) ? guess : tryAgain();
}`,
    generateSteps: guessSort,
  },
"worstsort": {
    code: `function worstsort(array) {
  intentionallyMakeSortingAsBadAsPossible(array);
  return eventuallySort(array);
}`,
    generateSteps: worstSort,
  },
"best-sort": {
    code: `function bestSort(array) {
  if (isAlreadyBest(array)) return array;
  return explainWhyInputShouldHaveBeenSorted();
}`,
    generateSteps: bestSort,
  },
"panic-sort": {
    code: `function panicSort(array) {
  if (!isSorted(array)) panic();
  return recoverAndSort(array);
}`,
    generateSteps: panicSort,
  },
"annealing-sort": {
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
    code: `function geneticSort(array) {
  let population = randomPermutations(array);
  evolveUntilSorted(population);
  return bestIndividual(population);
}`,
    generateSteps: geneticSort,
  },
"entropy-sort": {
    code: `function entropySort(array) {
  chooseComparisonsThatReduceUncertainty(array);
  return sorted(array);
}`,
    generateSteps: entropySort,
  },
"time-sort": {
    code: `function timeSort(array) {
  scheduleEachValueByTime(array);
  return collectInTimerOrder();
}`,
    generateSteps: timeSort,
  },
"calendar-sort": {
    code: `function calendarSort(array) {
  bucketByCalendarSlot(array);
  sortInsideSlots(array);
  return flattenCalendar(array);
}`,
    generateSteps: calendarSort,
  },
"burnt-pancake-sort": {
    code: `function burntPancakeSort(stack) {
  while (!isSortedAndRightSideUp(stack)) {
    flipPrefixAndToggleSides(stack);
  }
  return stack;
}`,
    generateSteps: (input) => simulatedCatalogSort(input, "烤焦煎饼排序需要表示正反面；数字数组中只模拟翻面排序结果。"),
  },
"histogram-sort": {
    code: `function histogramSort(array) {
  const histogram = countFrequencies(array);
  return expandHistogram(histogram);
}`,
    generateSteps: histogramSort,
  },
"random-comparator-sort": {
    code: `function randomComparatorSort(array) {
  return array.sort(() => Math.random() - 0.5);
}
// 比较器不自洽，真实运行结果不可依赖。`,
    generateSteps: (input) => simulatedCatalogSort(input, "随机比较器违反排序比较契约，真实结果不可预测；这里只模拟安全结果。"),
  },
"sleep-sort": {
    code: `function sleepSort(array, emit) {
  for (const value of array) {
    setTimeout(() => emit(value), value);
  }
}
// Sorting Zoo 首版只做模拟演示，不启动真实定时器排序。`,
    generateSteps: sleepSort,
  }
};
