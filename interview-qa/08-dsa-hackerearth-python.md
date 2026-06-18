# DSA Crash + Pattern Bank (Python-first) — HackerEarth OA & Coding Round

> **For:** Saiganesh — Fractal Analytics, immediate gate = HackerEarth Online Assessment (timed coding, easy–medium, Python, STDIN/STDOUT), then a coding round in Tech Round 1.
>
> **Goal of this file:** a *practical* crash bank. Every pattern has: when to recognize it, a template you can paste, 1–2 fully worked problems with input reading + solving + printing, and complexity. Stars ⭐ mark the highest-yield stuff for easy-medium OAs.
>
> **How to use this under time pressure:** skim the ⭐ sections + the "Pattern recognition cheat sheet" + the "Final 30-minute-before-OA checklist". Memorize the I/O templates cold — they save you minutes per problem and prevent silly wrong-answer-on-format mistakes.

---

## Table of contents

1. ⭐ HackerEarth / competitive I/O in Python
2. ⭐ Big-O & complexity (and "will this pass?")
3. Core patterns
   - Arrays & hashing
   - Two pointers
   - ⭐ Sliding window
   - Strings
   - Stack
   - Queue / deque
   - Hashmap / set patterns
   - ⭐ Sorting & searching
   - Recursion & backtracking
   - ⭐ Linked list
   - Trees
   - Graphs
   - Heaps / priority queue (TARA top-k)
   - ⭐ Hashing & dictionaries (highest yield)
   - Intervals
   - Greedy
   - Dynamic programming basics
   - Bit manipulation
   - Math
4. ⭐ Pattern recognition cheat sheet
5. Common OA archetypes — fully worked
6. Time-management & debugging for a timed OA
7. ⭐ Python stdlib for DSA cheat
8. ⭐ Final 30-minute-before-OA checklist

---

# 1. ⭐ HackerEarth / competitive I/O in Python

HackerEarth (like Codeforces/HackerRank) feeds your program via **STDIN** and reads **STDOUT**. There is no function-signature harness like LeetCode (sometimes there is, but the OA style here is usually raw I/O). So **getting input parsing right is half the battle**. Wrong-answer verdicts are very often I/O bugs, not algorithm bugs.

## The one template to memorize

```python
import sys

def main():
    data = sys.stdin.buffer.read().split()   # all tokens at once, as bytes
    idx = 0
    def nxt():
        nonlocal idx
        val = data[idx]; idx += 1
        return val

    n = int(nxt())
    arr = [int(nxt()) for _ in range(n)]

    # ... solve ...
    print(result)

main()
```

`sys.stdin.buffer.read().split()` reads the **entire** input, splits on any whitespace (spaces and newlines alike), and gives you a flat list of byte-strings. `int(b'5')` works fine in Python 3, so you can `int()` each token directly. This is the **fastest and most robust** general reader: it doesn't care how the input is laid out across lines.

> **Why fast input matters:** `input()` is a Python function call per line and is *slow* for big inputs (e.g., 10^5–10^6 lines). With `sys.stdin`, you read once. On a tight time limit, `input()` in a loop can TLE where `sys.stdin` passes.

## Reading patterns (copy/paste)

```python
import sys
input = sys.stdin.readline   # cheap upgrade: makes input() faster (reads one line)

# single int
n = int(input())

# two ints on one line: "3 7"
a, b = map(int, input().split())

# a list of ints on one line: "4 1 5 9 2"
arr = list(map(int, input().split()))

# n lines, each one int
n = int(input())
arr = [int(input()) for _ in range(n)]

# a string (strip the trailing newline!)
s = input().strip()

# a 2D grid: first line "rows cols", then `rows` lines of numbers
r, c = map(int, input().split())
grid = [list(map(int, input().split())) for _ in range(r)]

# a char grid (maze of '.' and '#')
r, c = map(int, input().split())
grid = [input().strip() for _ in range(r)]   # list of strings; grid[i][j]
```

> **`input = sys.stdin.readline` gotcha:** `readline` keeps the trailing `\n`. For ints it doesn't matter (`int(" 5\n")` is fine). For **strings always `.strip()`** or you'll carry a `\n` and mis-compare.

## Multiple test cases (very common on HackerEarth)

The classic format: first line is `T` (number of test cases), then each test case follows.

```python
import sys

def main():
    data = sys.stdin.buffer.read().split()
    pos = 0
    def rd():
        nonlocal pos
        v = data[pos]; pos += 1
        return v

    t = int(rd())
    out = []
    for _ in range(t):
        n = int(rd())
        arr = [int(rd()) for _ in range(n)]
        ans = sum(arr)          # whatever the task is
        out.append(str(ans))

    sys.stdout.write("\n".join(out) + "\n")

main()
```

> **Batch your output.** Don't `print()` inside a tight loop over 10^5 test cases — each `print` flushes and is slow. Collect strings in a list and `sys.stdout.write("\n".join(out))` once at the end. This alone has rescued many TLEs.

## Printing — common formats

```python
print(x)                        # single value
print(a, b, c)                  # space-separated: "1 2 3"
print(*arr)                     # unpack a list space-separated: "4 1 5 9 2"
print(" ".join(map(str, arr)))  # same, explicit
print("\n".join(map(str, arr))) # one per line
print(f"{ans:.2f}")             # 2 decimal places, e.g. floats
print("YES" if ok else "NO")    # boolean answers — match the EXACT case asked
```

## Common I/O pitfalls (these cause silent WA / TLE)

| Pitfall | Symptom | Fix |
|---|---|---|
| Using `input()` in a big loop | TLE on large inputs | `sys.stdin.buffer.read().split()` or `input = sys.stdin.readline` |
| Forgetting `.strip()` on strings | Wrong comparisons, trailing `\n` | `s = input().strip()` |
| `print` inside huge loop | TLE | buffer into a list, write once |
| Wrong case for `YES`/`Yes`/`yes` | WA | copy the exact string from the statement |
| Reading line-by-line when tokens span lines | IndexError / wrong values | read all tokens flat with the `nxt()` helper |
| Off-by-one in number of items to read | Hang (waiting for input) or extra garbage | re-check the count variable |
| Mixing `readline` and `read` | Skipped/duplicated input | pick one strategy and stick to it |
| Printing extra debug output | WA | remove all stray prints before submit |

> **Float formatting:** if the answer is a float and they ask for fixed precision, use `f"{x:.6f}"` (or whatever they specify). Don't print Python's default float repr (`0.30000000000000004`).

---

# 2. ⭐ Big-O & complexity (and "will this pass?")

You rarely need formal proofs in an OA. You need to **estimate from the constraints** whether your idea is fast enough *before* you code it. That saves you from coding a solution that TLEs.

## The "operations budget" rule of thumb

Modern judges do roughly **10^7–10^8 simple operations per second** for Python (Python is ~10–50x slower than C++, so be conservative — treat Python's safe budget as about **10^7 operations** for a 1–2 second limit, up to ~10^8 if the operations are very light / vectorized).

Read `n` (the largest constraint), then map it to an acceptable complexity:

| Constraint on n | Target complexity | Typical approach |
|---|---|---|
| n ≤ 10–12 | O(n!) / O(2^n) | brute force, permutations, full backtracking |
| n ≤ 20–25 | O(2^n) | subset enumeration, bitmask DP |
| n ≤ 100–500 | O(n^3) | triple loops, Floyd–Warshall, some DP |
| n ≤ 2000–5000 | O(n^2) | nested loops, O(n^2) DP, LCS |
| n ≤ 10^5 | **O(n log n)** | sorting, heaps, binary search, balanced approaches |
| n ≤ 10^6 | **O(n)** or O(n log n) with small constant | single pass, hashing, sliding window, prefix sums |
| n ≤ 10^8+ | O(log n) or O(1) | math formula, binary search on the answer |

**The single most useful inference:** `n ≤ 1e5` (or `2e5`) almost always means the intended solution is **O(n log n)** — so reach for sorting / a heap / binary search / a hashmap pass, *not* a nested loop. A nested loop is 10^10 operations there → instant TLE.

## Time vs space

- **Time complexity** counts operations as input grows.
- **Space complexity** counts extra memory. A hashmap of all elements is O(n) space; an in-place two-pointer trick is O(1) extra. OAs rarely fail on memory for easy-medium, but watch out for building huge 2D DP tables (e.g., O(n·m) ints when n,m ~ 10^4 each = 10^8 ints = too much).

## Amortized analysis (the one case you'll meet)

Some operations are occasionally expensive but cheap *on average*:
- **`list.append`** is O(1) amortized (occasionally the list reallocates and copies, but averaged over many appends it's O(1)).
- **Sliding window / two pointers:** each pointer moves forward at most n times total, so even with a nested-looking `while`, the whole thing is O(n) amortized — *not* O(n^2). This is why sliding window beats brute force.

## ⭐ Python-specific costs (these bite you)

| Operation | Cost | Note |
|---|---|---|
| `x in list` | **O(n)** | scans the list — avoid in loops! |
| `x in set` / `x in dict` | **O(1)** avg | use a `set`/`dict` for membership tests |
| `dict[key]`, `dict[key]=v` | O(1) avg | hashing |
| `list.append` | O(1) amortized | fast |
| `list.pop()` (end) | O(1) | fast |
| `list.pop(0)` (front) | **O(n)** | shifts everything — use `collections.deque` instead |
| `list.insert(0, x)` | **O(n)** | same problem — use `deque.appendleft` |
| `deque.popleft / appendleft` | O(1) | the right tool for a queue |
| `s += c` in a loop (string) | **O(n²)** | strings are immutable; each `+=` copies. Build a `list`, then `"".join(...)` |
| `sorted(arr)` / `arr.sort()` | O(n log n) | Timsort, very fast in practice |
| slicing `arr[i:j]` | O(j-i) | creates a copy |
| `min`/`max`/`sum` over list | O(n) | one pass |

**Two rules that fix most accidental TLEs:**
1. **Need membership tests in a loop?** Use a `set`/`dict`, never `in list`. (Your VMS dedup of CVEs — a `set` membership check is exactly the O(1) lookup that makes dedup of thousands of rows fast instead of O(n²).)
2. **Building a string char by char?** Append to a list and `"".join`, never `+=` in a loop.

```python
# BAD: O(n^2) because of `in list` and string +=
seen = []
out = ""
for x in data:
    if x not in seen:      # O(n) each time -> O(n^2) total
        seen.append(x)
        out += str(x)      # O(len) copy each time -> O(n^2)

# GOOD: O(n)
seen = set()
parts = []
for x in data:
    if x not in seen:      # O(1)
        seen.add(x)
        parts.append(str(x))
out = "".join(parts)        # one O(n) join
```

---

# 3. Core patterns

---

## Arrays & hashing

**When to recognize it:** you're asked about "does a pair/element exist", "count of each value", "remove duplicates", "running sum / sum of a range", "max sum subarray". Anything about *frequencies*, *existence*, or *cumulative sums*.

### a) Two Sum (hashmap of complements)

**When:** find two indices whose values add to a target. The hashmap turns an O(n²) double loop into O(n).

```python
def two_sum(nums, target):
    seen = {}                      # value -> index
    for i, x in enumerate(nums):
        need = target - x
        if need in seen:           # O(1) lookup
            return (seen[need], i)
        seen[x] = i
    return None
```
Complexity: **O(n) time, O(n) space.**

### b) Frequency counts with `Counter`

**When:** "how many times does each element appear", "most common", "is there a majority".

```python
from collections import Counter

def most_common_element(nums):
    cnt = Counter(nums)            # {value: frequency}
    val, freq = cnt.most_common(1)[0]
    return val, freq
```
Complexity: **O(n).**

### c) Dedup with a set

**When:** "remove duplicates", "count distinct", "is there a duplicate". (VMS: dedup CVE rows.)

```python
def has_duplicate(nums):
    return len(set(nums)) != len(nums)

def distinct_preserve_order(nums):
    seen, out = set(), []
    for x in nums:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out
```
Complexity: **O(n) time, O(n) space.**

### d) ⭐ Prefix sums (range sum queries)

**When:** "sum of elements between index L and R", repeatedly. Precompute once, answer each query in O(1).

```python
def build_prefix(arr):
    pre = [0] * (len(arr) + 1)
    for i, x in enumerate(arr):
        pre[i + 1] = pre[i] + x
    return pre

def range_sum(pre, l, r):          # inclusive l..r, 0-indexed
    return pre[r + 1] - pre[l]
```
Complexity: **O(n) build, O(1) per query.** Generalizes to "count of elements with some property in a range" and to 2D grids.

> **Subarray sum equals K** (classic, prefix + hashmap): count subarrays summing to `k`.
> ```python
> from collections import defaultdict
> def subarray_sum_k(arr, k):
>     count = 0
>     pre = 0
>     seen = defaultdict(int)
>     seen[0] = 1                     # empty prefix
>     for x in arr:
>         pre += x
>         count += seen[pre - k]      # how many earlier prefixes make a window summing to k
>         seen[pre] += 1
>     return count
> ```
> Complexity: **O(n).**

### e) ⭐ Kadane's max subarray sum

**When:** "maximum sum of a contiguous subarray" (allowing negatives).

```python
def max_subarray(arr):
    best = cur = arr[0]
    for x in arr[1:]:
        cur = max(x, cur + x)      # extend or restart
        best = max(best, cur)
    return best
```
Complexity: **O(n) time, O(1) space.** Edge case: all negatives → returns the largest (least negative) element, which is correct.

---

## Two pointers

**When to recognize it:** the array is **sorted** (or you can sort it) and you want pairs/triples meeting a condition; or you process from both ends inward; or you maintain a "write" pointer while scanning. Converts many O(n²) scans into O(n).

### Template

```python
def two_pointer_pair_sum(arr, target):
    arr.sort()                      # if not already sorted (O(n log n))
    lo, hi = 0, len(arr) - 1
    while lo < hi:
        s = arr[lo] + arr[hi]
        if s == target:
            return (arr[lo], arr[hi])
        elif s < target:
            lo += 1                 # need bigger -> move left pointer up
        else:
            hi -= 1                 # need smaller -> move right pointer down
    return None
```
Complexity: **O(n log n)** with the sort, **O(n)** if already sorted.

### Remove duplicates from a sorted array in place

```python
def remove_dupes_sorted(arr):
    if not arr:
        return 0
    w = 1                           # write index
    for r in range(1, len(arr)):    # read index
        if arr[r] != arr[w - 1]:
            arr[w] = arr[r]
            w += 1
    return w                        # arr[:w] is the deduped array
```
Complexity: **O(n) time, O(1) extra space.**

### Container With Most Water (classic)

**When:** maximize area between two lines; shrink from the wider/shorter side.

```python
def max_area(height):
    lo, hi = 0, len(height) - 1
    best = 0
    while lo < hi:
        h = min(height[lo], height[hi])
        best = max(best, h * (hi - lo))
        if height[lo] < height[hi]:
            lo += 1                 # move the shorter wall inward
        else:
            hi -= 1
    return best
```
Complexity: **O(n).**

### Reverse in place

```python
def reverse_inplace(arr):
    lo, hi = 0, len(arr) - 1
    while lo < hi:
        arr[lo], arr[hi] = arr[hi], arr[lo]
        lo += 1
        hi -= 1
    return arr
```

---

## ⭐ Sliding window

**When to recognize it:** "longest/shortest/maximum/minimum **contiguous** subarray/substring" satisfying a condition; "at most K of something"; fixed-size window stats. If you find yourself wanting nested loops over subarrays, sliding window usually collapses it to O(n).

Two flavors: **fixed-size window** and **variable-size window** (grow right, shrink left while condition violated).

### Fixed-size window (max sum of any k consecutive)

```python
def max_sum_window_k(arr, k):
    window = sum(arr[:k])
    best = window
    for r in range(k, len(arr)):
        window += arr[r] - arr[r - k]   # slide: add new, drop old
        best = max(best, window)
    return best
```
Complexity: **O(n).**

### Variable window template (the workhorse)

```python
def variable_window(arr):
    left = 0
    # some running state: a count, a sum, a Counter, etc.
    best = 0
    for right in range(len(arr)):
        # 1) include arr[right] in the window state
        ...
        # 2) while the window is INVALID, shrink from the left
        while window_is_invalid():
            # remove arr[left] from state
            ...
            left += 1
        # 3) window is now valid -> update the answer
        best = max(best, right - left + 1)
    return best
```

### ⭐ Longest substring without repeating characters (the canonical one)

```python
def longest_unique_substring(s):
    last = {}                        # char -> last index seen
    left = 0
    best = 0
    for right, ch in enumerate(s):
        if ch in last and last[ch] >= left:
            left = last[ch] + 1      # jump left past the previous occurrence
        last[ch] = right
        best = max(best, right - left + 1)
    return best
```
Complexity: **O(n) time, O(min(n, alphabet)) space.**

### Minimum window length with sum ≥ target (variable window, positives)

```python
def min_window_sum_at_least(arr, target):
    left = 0
    cur = 0
    best = float('inf')
    for right, x in enumerate(arr):
        cur += x
        while cur >= target:                  # shrink while still valid
            best = min(best, right - left + 1)
            cur -= arr[left]
            left += 1
    return best if best != float('inf') else 0
```
Complexity: **O(n).** (Each index enters and leaves the window once — amortized O(n).)

> **Recognition tip:** "longest with at most K distinct", "smallest subarray with sum ≥ S", "max vowels in a window of size k" → all sliding window. Use a `Counter` as the window state for distinct/character-count variants.

---

## Strings

**When to recognize it:** anagrams, palindromes, frequency over characters, simple parsing/tokenizing, building output strings. Remember strings are **immutable** — build with a list + `join`.

### Anagram check

```python
from collections import Counter
def is_anagram(a, b):
    return Counter(a) == Counter(b)   # O(n); compares char frequencies
```

### Group anagrams (sorted-string key)

```python
from collections import defaultdict
def group_anagrams(words):
    groups = defaultdict(list)
    for w in words:
        key = "".join(sorted(w))      # anagrams share this key
        groups[key].append(w)
    return list(groups.values())
```
Complexity: **O(N · k log k)** for N words of length k.

### Palindrome check (ignore case/non-alnum optionally)

```python
def is_palindrome(s):
    lo, hi = 0, len(s) - 1
    while lo < hi:
        if s[lo] != s[hi]:
            return False
        lo += 1; hi -= 1
    return True

def is_palindrome_clean(s):
    t = [c.lower() for c in s if c.isalnum()]
    return t == t[::-1]
```

### String building (the right way)

```python
parts = []
for i in range(n):
    parts.append(str(i))
result = "".join(parts)               # O(total length), NOT O(n^2)
```

### Basic parsing

```python
s = "12,7,  9 , 100"
nums = [int(tok) for tok in s.split(",")]     # strip handles spaces: int(" 9 ") works

line = "name=Alice age=30"
kv = dict(pair.split("=") for pair in line.split())
# kv == {"name": "Alice", "age": "30"}
```

### Character frequency

```python
from collections import Counter
freq = Counter("mississippi")        # {'s':4,'i':4,'p':2,'m':1}
first_unique = next((c for c in "leetcode" if Counter("leetcode")[c] == 1), None)
```

---

## Stack

**When to recognize it:** matching/nesting (parentheses, tags), "undo"/most-recent-first, evaluating expressions, and **monotonic stack** problems ("next greater/smaller element", "largest rectangle"). A Python `list` is a perfectly good stack (`append`/`pop`).

### Valid parentheses

```python
def valid_parens(s):
    pairs = {')': '(', ']': '[', '}': '{'}
    st = []
    for c in s:
        if c in '([{':
            st.append(c)
        else:
            if not st or st.pop() != pairs[c]:
                return False
    return not st                    # must be empty at the end
```
Complexity: **O(n).**

### Monotonic stack — Next Greater Element

**When:** for each element, find the next element to the right that's larger (or smaller). Brute force is O(n²); a monotonic stack is O(n).

```python
def next_greater(arr):
    n = len(arr)
    ans = [-1] * n
    st = []                          # holds indices; values decreasing from bottom to top
    for i in range(n):
        while st and arr[st[-1]] < arr[i]:
            ans[st.pop()] = arr[i]   # arr[i] is the next greater for the popped index
        st.append(i)
    return ans
```
Complexity: **O(n)** (each index pushed and popped once).

### Evaluate Reverse Polish Notation (stack of operands)

```python
def eval_rpn(tokens):
    st = []
    ops = {'+', '-', '*', '/'}
    for t in tokens:
        if t in ops:
            b = st.pop(); a = st.pop()
            if t == '+': st.append(a + b)
            elif t == '-': st.append(a - b)
            elif t == '*': st.append(a * b)
            else: st.append(int(a / b))   # truncate toward zero
        else:
            st.append(int(t))
    return st[0]
```

---

## Queue / deque

**When to recognize it:** FIFO processing (BFS level-by-level), or you need O(1) push/pop at **both** ends (sliding-window maximum). Use `collections.deque` — never `list.pop(0)`.

### deque basics

```python
from collections import deque
q = deque()
q.append(x)        # push back
q.appendleft(x)    # push front
q.pop()            # pop back
q.popleft()        # pop front  (O(1) — this is the point)
```

### Sliding window maximum (monotonic deque)

**When:** maximum of every window of size k. O(n) using a deque of indices kept in decreasing value order.

```python
from collections import deque
def sliding_window_max(arr, k):
    dq = deque()            # indices, arr-values decreasing front->back
    out = []
    for i, x in enumerate(arr):
        while dq and arr[dq[-1]] <= x:    # pop smaller-or-equal from the back
            dq.pop()
        dq.append(i)
        if dq[0] <= i - k:                # front fell out of the window
            dq.popleft()
        if i >= k - 1:
            out.append(arr[dq[0]])        # front is the window max
    return out
```
Complexity: **O(n).**

### BFS skeleton (queue)

```python
from collections import deque
def bfs(start, graph):
    seen = {start}
    q = deque([start])
    order = []
    while q:
        node = q.popleft()
        order.append(node)
        for nb in graph[node]:
            if nb not in seen:
                seen.add(nb)
                q.append(nb)
    return order
```

---

## Hashmap / set patterns

**When to recognize it:** grouping by a key, "have I seen this before", first/only unique, counting, complement lookups. This is the bread-and-butter of easy-medium OAs — see the dedicated ⭐ section below for the highest-yield recipes.

### Grouping by a computed key

```python
from collections import defaultdict
def group_by_length(words):
    g = defaultdict(list)
    for w in words:
        g[len(w)].append(w)
    return dict(g)
```

### Seen-set (existence / cycle / dedup)

```python
def first_repeated(nums):
    seen = set()
    for x in nums:
        if x in seen:
            return x
        seen.add(x)
    return None
```

### First unique element (order-preserving with Counter)

```python
from collections import Counter
def first_unique(nums):
    cnt = Counter(nums)
    for x in nums:
        if cnt[x] == 1:
            return x
    return None
```

---

## ⭐ Sorting & searching

**When to recognize it:** "k-th largest/smallest", "sort by/then by", "find/insert position", "minimize the maximum / maximize the minimum" (binary search on the answer), "is X present in a sorted array".

### Sorting with a key

```python
people = [("Alice", 30), ("Bob", 25), ("Cara", 30)]

people.sort(key=lambda p: p[1])                 # by age ascending
people.sort(key=lambda p: -p[1])                # by age descending
people.sort(key=lambda p: (-p[1], p[0]))        # age DESC, then name ASC (tie-break)
nums.sort(reverse=True)                          # plain descending
```

> **Tie-break trick:** return a tuple from the key. Python sorts tuples lexicographically. Negate a numeric field to reverse just that field while keeping others ascending. (VMS: sorting/filtering 3,500+ rows by multiple columns is exactly a tuple-key sort.)

### Custom comparator (when a key isn't enough)

When the order depends on *comparing two items* in a way you can't express as a key (e.g., "arrange numbers to form the largest concatenation"), use `functools.cmp_to_key`.

```python
from functools import cmp_to_key

def largest_number(nums):
    strs = list(map(str, nums))
    def cmp(a, b):
        if a + b > b + a:   # "9"+"34" vs "34"+"9" -> "934" > "349"
            return -1       # a should come first
        elif a + b < b + a:
            return 1
        return 0
    strs.sort(key=cmp_to_key(cmp))
    res = "".join(strs)
    return "0" if res[0] == "0" else res   # handle all-zeros
```
Complexity: **O(n log n)** comparisons.

### Binary search (manual template — know it cold)

```python
def binary_search(arr, target):       # arr sorted ascending
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1                          # not found
```
Complexity: **O(log n).**

### `bisect` (use it instead of hand-rolling when possible)

```python
import bisect
arr = [1, 3, 3, 5, 8]
bisect.bisect_left(arr, 3)    # 1  -> first index where 3 could go (leftmost)
bisect.bisect_right(arr, 3)   # 3  -> rightmost insertion point
bisect.insort(arr, 4)         # insert 4 keeping sorted order

# count of elements equal to x:
cnt_x = bisect.bisect_right(arr, x) - bisect.bisect_left(arr, x)
# count of elements <= x:
cnt_le = bisect.bisect_right(arr, x)
# smallest element >= x (lower bound):
i = bisect.bisect_left(arr, x)
val = arr[i] if i < len(arr) else None
```

### ⭐ Binary search on the answer ("search on answer")

**When:** the problem asks to **minimize a maximum** or **maximize a minimum**, or "smallest capacity/speed/days such that it's feasible". The answer is monotonic: if value V works, everything bigger works (or smaller). Binary-search over the answer range with a `feasible(V)` check.

```python
def min_capacity_to_ship(weights, days):
    # feasible(cap): can we ship within `days` if each day carries <= cap?
    def feasible(cap):
        d, cur = 1, 0
        for w in weights:
            if cur + w > cap:
                d += 1
                cur = 0
            cur += w
        return d <= days

    lo, hi = max(weights), sum(weights)   # min possible cap, max possible cap
    while lo < hi:
        mid = (lo + hi) // 2
        if feasible(mid):
            hi = mid          # try smaller
        else:
            lo = mid + 1      # need bigger
    return lo
```
Complexity: **O(n log(range)).** This pattern shows up constantly in medium OAs ("minimum eating speed", "split array largest sum", "minimum days to make bouquets").

---

## Recursion & backtracking

**When to recognize it:** generate all subsets/permutations/combinations, "try every choice and backtrack", constraint puzzles (N-queens), tree/DFS structure. Backtracking = choose → recurse → un-choose.

### Factorial / Fibonacci (basic recursion + memo)

```python
def factorial(n):
    return 1 if n <= 1 else n * factorial(n - 1)

from functools import lru_cache
@lru_cache(maxsize=None)
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)   # memoized -> O(n)
```

### Subsets (power set)

```python
def subsets(nums):
    res = []
    def backtrack(start, path):
        res.append(path[:])               # record current subset
        for i in range(start, len(nums)):
            path.append(nums[i])          # choose
            backtrack(i + 1, path)        # recurse on the rest
            path.pop()                    # un-choose (backtrack)
    backtrack(0, [])
    return res
```
Complexity: **O(2^n)** subsets. (Only feasible for small n — check constraints!)

### Permutations

```python
def permutations(nums):
    res = []
    used = [False] * len(nums)
    def backtrack(path):
        if len(path) == len(nums):
            res.append(path[:])
            return
        for i in range(len(nums)):
            if used[i]:
                continue
            used[i] = True
            path.append(nums[i])
            backtrack(path)
            path.pop()
            used[i] = False
    backtrack([])
    return res
```
Complexity: **O(n · n!).**

### Combinations (choose k of n)

```python
def combinations(n, k):
    res = []
    def backtrack(start, path):
        if len(path) == k:
            res.append(path[:])
            return
        for i in range(start, n + 1):
            path.append(i)
            backtrack(i + 1, path)
            path.pop()
    backtrack(1, [])
    return res
```

> Or just use `itertools.permutations(arr)`, `itertools.combinations(arr, k)`, `itertools.product(...)` — perfectly fine and faster to write in an OA when the counts are small.

### N-queens-lite (count solutions)

```python
def count_n_queens(n):
    cols, diag, anti = set(), set(), set()
    def backtrack(r):
        if r == n:
            return 1
        total = 0
        for c in range(n):
            if c in cols or (r - c) in diag or (r + c) in anti:
                continue
            cols.add(c); diag.add(r - c); anti.add(r + c)
            total += backtrack(r + 1)
            cols.remove(c); diag.remove(r - c); anti.remove(r + c)
        return total
    return backtrack(0)
```

> **Recursion depth:** Python's default recursion limit is ~1000. For deep recursion (e.g., DFS on a 10^5-node path graph) either convert to an iterative stack-based DFS or `sys.setrecursionlimit(300000)` at the top. Setting it too high without enough stack can crash — prefer iterative DFS for large inputs.

---

## ⭐ Linked list

**When to recognize it:** the input is a chain of nodes (`val`, `next`), or the problem literally says "linked list". Core tricks: dummy head, fast/slow pointers, careful pointer rewiring. In an OA you'll often build the list from input yourself.

```python
class ListNode:
    def __init__(self, val=0, nxt=None):
        self.val = val
        self.next = nxt

def build_list(values):               # helper to construct from a Python list
    dummy = ListNode()
    cur = dummy
    for v in values:
        cur.next = ListNode(v)
        cur = cur.next
    return dummy.next

def to_pylist(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out
```

### Reverse a linked list

```python
def reverse_list(head):
    prev = None
    cur = head
    while cur:
        nxt = cur.next     # save next
        cur.next = prev    # reverse the pointer
        prev = cur         # advance prev
        cur = nxt          # advance cur
    return prev            # new head
```
Complexity: **O(n) time, O(1) space.**

### Detect a cycle (Floyd's tortoise & hare)

```python
def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:           # pointers meet -> cycle
            return True
    return False
```
Complexity: **O(n) time, O(1) space.**

### Find the middle (slow/fast)

```python
def middle_node(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow                    # for even length, returns the second middle
```

### Merge two sorted lists

```python
def merge_two_lists(a, b):
    dummy = ListNode()
    tail = dummy
    while a and b:
        if a.val <= b.val:
            tail.next = a; a = a.next
        else:
            tail.next = b; b = b.next
        tail = tail.next
    tail.next = a or b             # attach whatever remains
    return dummy.next
```
Complexity: **O(n + m).**

> **Dummy-head trick:** start with a throwaway `dummy` node so you never special-case "the list is empty / inserting at the head". Return `dummy.next`.

---

## Trees

**When to recognize it:** input is a binary tree / BST, or hierarchical structure; questions about height, traversal order, level-by-level, ancestors, search.

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
```

### DFS traversals (recursive)

```python
def inorder(root, out):    # left, node, right  -> sorted order for a BST
    if root:
        inorder(root.left, out)
        out.append(root.val)
        inorder(root.right, out)

def preorder(root, out):   # node, left, right
    if root:
        out.append(root.val)
        preorder(root.left, out)
        preorder(root.right, out)

def postorder(root, out):  # left, right, node
    if root:
        postorder(root.left, out)
        postorder(root.right, out)
        out.append(root.val)
```

### Height / max depth

```python
def height(root):
    if not root:
        return 0
    return 1 + max(height(root.left), height(root.right))
```

### Level order (BFS) — returns list of levels

```python
from collections import deque
def level_order(root):
    if not root:
        return []
    res = []
    q = deque([root])
    while q:
        level = []
        for _ in range(len(q)):           # process exactly one level
            node = q.popleft()
            level.append(node.val)
            if node.left:  q.append(node.left)
            if node.right: q.append(node.right)
        res.append(level)
    return res
```

### BST insert / search

```python
def bst_insert(root, val):
    if not root:
        return TreeNode(val)
    if val < root.val:
        root.left = bst_insert(root.left, val)
    else:
        root.right = bst_insert(root.right, val)
    return root

def bst_search(root, val):
    while root:
        if val == root.val: return root
        root = root.left if val < root.val else root.right
    return None
```
Complexity: **O(h)** where h is height (O(log n) if balanced, O(n) worst case).

### Lowest Common Ancestor (general binary tree)

```python
def lca(root, p, q):
    if not root or root is p or root is q:
        return root
    left = lca(root.left, p, q)
    right = lca(root.right, p, q)
    if left and right:
        return root            # p and q split here -> this is the LCA
    return left or right
```

> **LCA in a BST** is simpler: walk down; if both target values are less, go left; if both greater, go right; otherwise you're at the split → that node is the LCA.

---

## Graphs

**When to recognize it:** nodes + edges, "connected", "reachable", "shortest path", "ordering with dependencies", "is there a cycle", grids treated as graphs (cells = nodes, adjacency = up/down/left/right).

### Build an adjacency list

```python
from collections import defaultdict
def build_graph(n, edges, directed=False):
    g = defaultdict(list)
    for u, v in edges:
        g[u].append(v)
        if not directed:
            g[v].append(u)
    return g
```

### BFS / DFS

```python
from collections import deque
def bfs(start, g):
    seen = {start}; q = deque([start]); order = []
    while q:
        u = q.popleft(); order.append(u)
        for v in g[u]:
            if v not in seen:
                seen.add(v); q.append(v)
    return order

def dfs_iter(start, g):
    seen = set(); st = [start]; order = []
    while st:
        u = st.pop()
        if u in seen:
            continue
        seen.add(u); order.append(u)
        for v in g[u]:
            if v not in seen:
                st.append(v)
    return order
```

### Connected components (count islands of connectivity)

```python
def count_components(n, edges):
    g = build_graph(n, edges)
    seen = set()
    comps = 0
    for node in range(n):
        if node not in seen:
            comps += 1
            # BFS/DFS flood from this node
            stack = [node]
            while stack:
                u = stack.pop()
                if u in seen: continue
                seen.add(u)
                for v in g[u]:
                    if v not in seen:
                        stack.append(v)
    return comps
```

### Number of islands (grid as graph)

```python
def num_islands(grid):
    if not grid: return 0
    R, C = len(grid), len(grid[0])
    seen = set()
    def flood(sr, sc):
        st = [(sr, sc)]
        while st:
            r, c = st.pop()
            if 0 <= r < R and 0 <= c < C and grid[r][c] == '1' and (r, c) not in seen:
                seen.add((r, c))
                st.extend([(r+1,c),(r-1,c),(r,c+1),(r,c-1)])
    count = 0
    for r in range(R):
        for c in range(C):
            if grid[r][c] == '1' and (r, c) not in seen:
                count += 1
                flood(r, c)
    return count
```
Complexity: **O(R·C).**

### Shortest path in an UNWEIGHTED graph = BFS

```python
from collections import deque
def shortest_path_bfs(start, target, g):
    if start == target: return 0
    dist = {start: 0}; q = deque([start])
    while q:
        u = q.popleft()
        for v in g[u]:
            if v not in dist:
                dist[v] = dist[u] + 1
                if v == target:
                    return dist[v]
                q.append(v)
    return -1                       # unreachable
```
**Key fact:** BFS gives shortest path *only when all edges have equal weight*. For weighted edges, use Dijkstra.

### Dijkstra-lite (non-negative weights, with a heap)

```python
import heapq
def dijkstra(start, g, n):
    # g[u] = list of (v, weight)
    dist = [float('inf')] * n
    dist[start] = 0
    pq = [(0, start)]               # (distance, node)
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:
            continue                # stale entry -> skip
        for v, w in g[u]:
            nd = d + w
            if nd < dist[v]:
                dist[v] = nd
                heapq.heappush(pq, (nd, v))
    return dist
```
Complexity: **O((V + E) log V).**

### Topological sort (Kahn's algorithm — dependency ordering)

**When:** "order tasks so prerequisites come first", course schedule, build order. Works on a DAG; also detects cycles (if you can't process all nodes, there's a cycle).

```python
from collections import deque, defaultdict
def topo_sort(n, edges):            # edge (u, v) means u must come before v
    g = defaultdict(list)
    indeg = [0] * n
    for u, v in edges:
        g[u].append(v)
        indeg[v] += 1
    q = deque(i for i in range(n) if indeg[i] == 0)
    order = []
    while q:
        u = q.popleft()
        order.append(u)
        for v in g[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)
    return order if len(order) == n else []   # [] => cycle exists
```

### Cycle detection in a directed graph (DFS colors)

```python
def has_cycle_directed(n, edges):
    g = defaultdict(list)
    for u, v in edges:
        g[u].append(v)
    color = [0] * n                 # 0=unvisited, 1=in-progress, 2=done
    def dfs(u):
        color[u] = 1
        for v in g[u]:
            if color[v] == 1:       # back-edge to an in-progress node
                return True
            if color[v] == 0 and dfs(v):
                return True
        color[u] = 2
        return False
    return any(color[i] == 0 and dfs(i) for i in range(n))
```

---

## Heaps / priority queue (TARA top-k)

**When to recognize it:** "k largest / k smallest", "top-k by score", "merge k sorted lists", "repeatedly get the min/max", "median of a stream". Python's `heapq` is a **min-heap**; negate values to simulate a max-heap.

> **Direct tie to TARA:** retrieving the top-k most similar items by similarity score is exactly a top-k heap problem. You don't sort all candidates (O(n log n)); you keep a size-k heap → O(n log k), which matters when n (candidate pool) is large and k is small.

### heapq basics

```python
import heapq
h = []
heapq.heappush(h, 5)
heapq.heappush(h, 1)
heapq.heappush(h, 3)
heapq.heappop(h)         # 1 (smallest)
h[0]                     # 3 (current min, without popping)
heapq.heapify(arr)       # turn a list into a heap in O(n) in place
```

### Top-k largest (size-k min-heap)

```python
import heapq
def top_k_largest(nums, k):
    h = []                          # min-heap of the k largest so far
    for x in nums:
        heapq.heappush(h, x)
        if len(h) > k:
            heapq.heappop(h)        # drop the smallest -> keep top k
    return sorted(h, reverse=True)
```
Complexity: **O(n log k)** — better than full sort when k ≪ n.

Or just use the built-ins (great for OAs):
```python
import heapq
heapq.nlargest(k, nums)                       # k largest
heapq.nsmallest(k, nums)                       # k smallest
heapq.nlargest(k, items, key=lambda x: x[1])   # top-k by a score field (TARA-style)
```

### k-th largest element

```python
import heapq
def kth_largest(nums, k):
    return heapq.nlargest(k, nums)[-1]
    # or O(n log k): keep a size-k min-heap, answer is h[0]
```

### Merge k sorted lists

```python
import heapq
def merge_k_sorted(lists):
    h = []
    for i, lst in enumerate(lists):
        if lst:
            heapq.heappush(h, (lst[0], i, 0))   # (value, which list, index in that list)
    out = []
    while h:
        val, li, idx = heapq.heappop(h)
        out.append(val)
        if idx + 1 < len(lists[li]):
            nxt = lists[li][idx + 1]
            heapq.heappush(h, (nxt, li, idx + 1))
    return out
```
Complexity: **O(N log k)** for N total elements across k lists.

> **Tuple ordering caveat:** heap compares tuples element-by-element. If the first elements tie, it compares the next. That's why I add an index `i` as a tie-breaker above — it avoids ever comparing the (possibly uncomparable) payload objects.

---

## ⭐ Hashing & dictionaries (highest-yield for easy-medium)

If you internalize one section for the OA, make it this one. A huge fraction of easy-medium problems reduce to "use a dict/set to remember something as you scan once." (VMS dedup of CVEs, frequency tables, complement lookups — all live here.)

### `dict`, `defaultdict`, `Counter` — which to reach for

```python
from collections import defaultdict, Counter

# plain dict: when you control insertion
d = {}
d[key] = d.get(key, 0) + 1          # counting idiom without KeyError

# defaultdict: auto-creates a default for missing keys
g = defaultdict(list)                # missing key -> []
g["a"].append(1)                     # no KeyError
counts = defaultdict(int)            # missing key -> 0
counts["x"] += 1

# Counter: purpose-built for frequencies
c = Counter("aabbbc")                # Counter({'b':3,'a':2,'c':1})
c.most_common(2)                     # [('b',3),('a',2)]
c["z"]                               # 0 (no KeyError for missing key)
c1 - c2                              # multiset difference (keeps positive counts)
c1 + c2                              # multiset sum
```

### High-yield recipes

```python
# 1) Two-sum style complement lookup  -> O(n)
seen = {}
for i, x in enumerate(nums):
    if target - x in seen: ...
    seen[x] = i

# 2) Frequency map then decision  -> O(n)
from collections import Counter
cnt = Counter(arr)
# majority element check, find elements appearing exactly twice, etc.

# 3) Grouping by key  -> O(n)
groups = defaultdict(list)
for item in items:
    groups[key_of(item)].append(item)

# 4) Seen-set for dedup / existence  -> O(n)  (VMS CVE dedup)
seen = set()
unique = [x for x in data if not (x in seen or seen.add(x))]   # one-liner dedup keeping order

# 5) Index-of-last-seen (for sliding window jumps)
last = {}
for i, ch in enumerate(s):
    last[ch] = i

# 6) Counting pairs with equal property  -> sum of C(freq, 2)
from collections import Counter
def count_equal_pairs(arr):
    return sum(f * (f - 1) // 2 for f in Counter(arr).values())
```

### Worked: Majority element (appears > n/2 times)

```python
from collections import Counter
def majority_element(nums):
    cnt = Counter(nums)
    n = len(nums)
    for val, f in cnt.items():
        if f > n // 2:
            return val
    return None
# Boyer–Moore O(1) space alternative:
def majority_bm(nums):
    cand, count = None, 0
    for x in nums:
        if count == 0:
            cand = x
        count += 1 if x == cand else -1
    return cand
```

### Worked: Contains-duplicate-within-k (set + sliding window)

```python
def contains_nearby_dup(nums, k):
    window = set()
    for i, x in enumerate(nums):
        if x in window:
            return True
        window.add(x)
        if len(window) > k:
            window.discard(nums[i - k])   # keep window of size k
    return False
```

> **Hashing pitfall:** lists/dicts/sets are **unhashable** → can't be set elements or dict keys. Use a **tuple** (immutable) as a key when you need to hash a coordinate `(r, c)` or a sorted-signature. `frozenset(...)` hashes an unordered collection.

---

## Intervals

**When to recognize it:** "merge overlapping ranges", "can a person attend all meetings", "max overlapping intervals", "minimum rooms". Almost always: **sort by start (or end), then sweep.**

### Merge intervals

```python
def merge_intervals(intervals):
    intervals.sort(key=lambda x: x[0])    # sort by start
    merged = [intervals[0]]
    for s, e in intervals[1:]:
        last = merged[-1]
        if s <= last[1]:                  # overlaps -> extend
            last[1] = max(last[1], e)
        else:
            merged.append([s, e])
    return merged
```
Complexity: **O(n log n).**

### Meeting rooms — can attend all?

```python
def can_attend_all(intervals):
    intervals.sort(key=lambda x: x[0])
    for i in range(1, len(intervals)):
        if intervals[i][0] < intervals[i - 1][1]:   # starts before previous ends
            return False
    return True
```

### Minimum meeting rooms (max simultaneous overlap)

```python
import heapq
def min_meeting_rooms(intervals):
    if not intervals:
        return 0
    intervals.sort(key=lambda x: x[0])
    ends = []                             # min-heap of meeting end times
    for s, e in intervals:
        if ends and ends[0] <= s:         # a room freed up before this start
            heapq.heappop(ends)
        heapq.heappush(ends, e)
    return len(ends)                      # peak number of concurrent rooms
```
Complexity: **O(n log n).**

---

## Greedy

**When to recognize it:** "maximum number of non-overlapping activities", "can you reach the end", "minimum coins with canonical denominations", "fewest jumps". A greedy choice that's locally optimal leads to a global optimum — but you must trust (or quickly justify) that the local choice is safe.

### Activity selection (max non-overlapping intervals)

```python
def max_activities(intervals):
    intervals.sort(key=lambda x: x[1])    # sort by END time
    count = 0
    last_end = float('-inf')
    for s, e in intervals:
        if s >= last_end:                 # doesn't overlap the last chosen
            count += 1
            last_end = e
    return count
```
Complexity: **O(n log n).** Greedy insight: always pick the activity that finishes earliest.

### Jump Game (can you reach the last index?)

```python
def can_jump(nums):
    reach = 0
    for i, x in enumerate(nums):
        if i > reach:           # there's a gap we can't cross
            return False
        reach = max(reach, i + x)
    return True
```
Complexity: **O(n).**

### Jump Game II (minimum jumps)

```python
def min_jumps(nums):
    jumps = 0
    cur_end = 0
    farthest = 0
    for i in range(len(nums) - 1):
        farthest = max(farthest, i + nums[i])
        if i == cur_end:        # must jump now
            jumps += 1
            cur_end = farthest
    return jumps
```

---

## Dynamic programming basics

> **Crash-mode note:** DP is lower priority for an easy-medium OA than hashing/two-pointers/sorting. But the five templates below cover the vast majority of DP that *does* show up. The mindset: define a state, write the recurrence, decide bottom-up array vs. top-down memo.

### Climbing stairs (1D DP / Fibonacci-shaped)

```python
def climb_stairs(n):
    if n <= 2:
        return n
    a, b = 1, 2                # ways to reach step 1, step 2
    for _ in range(3, n + 1):
        a, b = b, a + b        # ways(i) = ways(i-1) + ways(i-2)
    return b
```
Complexity: **O(n) time, O(1) space.**

### House robber (no two adjacent)

```python
def rob(nums):
    prev, cur = 0, 0           # best up to i-2, best up to i-1
    for x in nums:
        prev, cur = cur, max(cur, prev + x)
    return cur
```

### Coin change (min coins to make amount)

```python
def coin_change(coins, amount):
    INF = amount + 1
    dp = [0] + [INF] * amount  # dp[a] = min coins to make amount a
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a:
                dp[a] = min(dp[a], dp[a - c] + 1)
    return dp[amount] if dp[amount] != INF else -1
```
Complexity: **O(amount · #coins).**

### 0/1 Knapsack (each item used at most once)

```python
def knapsack(weights, values, cap):
    dp = [0] * (cap + 1)       # dp[c] = best value with capacity c
    for w, v in zip(weights, values):
        for c in range(cap, w - 1, -1):    # iterate DOWN so each item used once
            dp[c] = max(dp[c], dp[c - w] + v)
    return dp[cap]
```
Complexity: **O(n · cap).** The reverse inner loop is the trick that makes it 0/1 instead of unbounded.

### Longest Common Subsequence

```python
def lcs(a, b):
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[m][n]
```
Complexity: **O(m · n) time and space** (can be reduced to O(min(m,n)) space with two rows).

> **Top-down alternative for any of these:** write the recursive function and slap `@lru_cache(maxsize=None)` on it. It's often the fastest path to a correct DP under time pressure.

---

## Bit manipulation

**When to recognize it:** "find the one non-duplicated number", "count set bits", "is it a power of two", "subset enumeration via bitmasks", "toggle/check a flag". XOR is the star.

```python
# XOR: single number (every other element appears twice)
def single_number(nums):
    x = 0
    for n in nums:
        x ^= n            # pairs cancel (a^a=0), leftover is the unique one
    return x

# count set bits
def count_bits(n):
    return bin(n).count("1")        # simplest
def count_bits_kernighan(n):
    c = 0
    while n:
        n &= n - 1                  # clears the lowest set bit
        c += 1
    return c

# power of two?
def is_power_of_two(n):
    return n > 0 and (n & (n - 1)) == 0

# useful bit ops
n & (1 << k)     # is bit k set?
n | (1 << k)     # set bit k
n & ~(1 << k)    # clear bit k
n ^ (1 << k)     # toggle bit k
```
Complexity: all **O(1)** or O(number of bits).

> **Note on overflow:** Python ints are arbitrary precision — there is **no integer overflow**. You never need to worry about `int` limits or `% (10**9 + 7)` for overflow reasons (only when the *problem* asks for the answer modulo something).

---

## Math

**When to recognize it:** gcd/lcm, prime tests, "count primes up to N" (sieve), modular arithmetic ("answer mod 1e9+7"), combinatorics.

```python
import math

# gcd / lcm
math.gcd(12, 18)            # 6
def lcm(a, b):
    return a * b // math.gcd(a, b)
math.lcm(4, 6)             # 12 (Python 3.9+)

# primality (trial division)
def is_prime(n):
    if n < 2: return False
    i = 2
    while i * i <= n:
        if n % i == 0:
            return False
        i += 1
    return True

# Sieve of Eratosthenes: all primes up to N  -> O(N log log N)
def sieve(N):
    is_p = [True] * (N + 1)
    is_p[0] = is_p[1] = False
    for i in range(2, int(N**0.5) + 1):
        if is_p[i]:
            for j in range(i * i, N + 1, i):
                is_p[j] = False
    return [i for i, p in enumerate(is_p) if p]

# modular arithmetic
MOD = 10**9 + 7
(a * b) % MOD
pow(a, b, MOD)             # fast modular exponentiation a^b mod MOD, O(log b)
pow(a, MOD - 2, MOD)       # modular inverse of a (when MOD is prime), via Fermat

# combinatorics (Python 3.8+)
math.comb(n, k)            # n choose k
math.perm(n, k)            # n permute k
math.factorial(n)
```

---

# 4. ⭐ Pattern recognition cheat sheet

When you read the problem, match the **phrasing** to a pattern. This is the fastest way to pick an approach in an OA.

| If the problem says / asks for… | Reach for… |
|---|---|
| "two numbers that sum to / pair with property", "have I seen X" | **Hashmap (complement / seen-set)** |
| "count of each", "most frequent", "how many times" | **Counter / dict frequency** |
| "remove duplicates", "distinct count", "any repeats" | **set** |
| "sum of subarray L..R" repeatedly | **prefix sums** |
| "maximum sum contiguous subarray" | **Kadane** |
| "longest/shortest contiguous subarray/substring with condition", "at most K", "window of size k" | **⭐ sliding window** |
| sorted array + "pair/triple with sum", "two ends inward" | **two pointers** |
| "k largest / k smallest / top-k by score / median of stream" | **⭐ heap (heapq, nlargest)** |
| "k-th largest" | **heap** or **quickselect** |
| "next greater/smaller element", "valid parentheses", "largest rectangle" | **stack (monotonic)** |
| "shortest path, all edges equal", "level by level", "min steps" | **BFS (queue)** |
| "shortest path with weights" | **Dijkstra (heap)** |
| "order with prerequisites", "build order", "course schedule" | **topological sort** |
| "connected", "islands", "groups", "reachable" | **DFS/BFS / union-find** |
| "merge overlapping ranges", "meeting rooms" | **sort intervals + sweep** |
| "minimize the maximum / maximize the minimum", "smallest X such that feasible" | **⭐ binary search on the answer** |
| "is X in sorted data", "insertion position", "count ≤ X" | **binary search / bisect** |
| "all subsets/permutations/combinations", "try all", n ≤ ~12–20 | **backtracking** (or itertools) |
| "max activities / fewest of something / can reach end" | **greedy** |
| "ways to / min cost to / can you make amount", overlapping subproblems | **DP** |
| "the one unique number among pairs", "count bits", "power of two" | **bit manipulation (XOR)** |
| "gcd/lcm, primes, answer mod p" | **math / sieve / modpow** |
| input is nodes with `.next` | **linked list (fast/slow, dummy head)** |
| input is a binary tree / BST | **tree traversal (DFS/BFS)** |
| "sort by A then B", arrange to form largest/smallest | **sort with tuple key / cmp_to_key** |

**Constraint-first reflex:** look at `n`. `n ≤ 20` → think exponential/backtracking is fine. `n ≤ 2000` → O(n²) is fine. `n ≤ 1e5` → you need O(n log n) (sort/heap/binary search/hashmap). `n ≤ 1e6` → O(n) single pass.

---

# 5. Common OA archetypes — fully worked (read input → solve → print)

Each of these is end-to-end runnable. Practice typing them fast.

## Archetype 1 — Frequency / dedup (VMS-flavored)

> *Given a list of CVE-id integers (with possible duplicates), output the count of distinct ids and the most frequent id.*

```
Input:
8
1001 1002 1001 1003 1002 1001 1004 1002
```

```python
import sys
from collections import Counter

def main():
    data = sys.stdin.buffer.read().split()
    n = int(data[0])
    ids = list(map(int, data[1:1 + n]))

    distinct = len(set(ids))                 # O(n) dedup
    cnt = Counter(ids)                       # O(n) frequency
    # most frequent; tie-break by smallest id for determinism
    most_id = min(cnt, key=lambda k: (-cnt[k], k))

    print(distinct, most_id)                 # "4 1001"

main()
```

## Archetype 2 — Two sum, multiple test cases

> *T test cases. Each: n, then n integers, then a target. Print indices (1-based) of two numbers summing to target, or -1.*

```
Input:
2
4
2 7 11 15
9
3
1 2 3
7
```

```python
import sys

def main():
    data = sys.stdin.buffer.read().split()
    pos = 0
    def rd():
        nonlocal pos
        v = int(data[pos]); pos += 1
        return v

    t = rd()
    out = []
    for _ in range(t):
        n = rd()
        arr = [rd() for _ in range(n)]
        target = rd()
        seen = {}                            # value -> 1-based index
        ans = -1
        found = None
        for i, x in enumerate(arr, start=1):
            if target - x in seen:
                found = (seen[target - x], i)
                break
            seen[x] = i
        out.append(f"{found[0]} {found[1]}" if found else "-1")

    sys.stdout.write("\n".join(out) + "\n")

main()
```
Output:
```
1 2
-1
```

## Archetype 3 — Sliding window (longest substring without repeats)

> *Given a string, print the length of the longest substring with all distinct characters.*

```
Input:
abcabcbb
```

```python
import sys

def main():
    s = sys.stdin.readline().strip()
    last = {}
    left = 0
    best = 0
    for right, ch in enumerate(s):
        if ch in last and last[ch] >= left:
            left = last[ch] + 1
        last[ch] = right
        best = max(best, right - left + 1)
    print(best)                              # 3 ("abc")

main()
```

## Archetype 4 — Grid BFS (shortest path in a maze)

> *Grid of R×C. `.` is open, `#` is wall. Start at (0,0), target at (R-1,C-1). Print the minimum number of steps, or -1.*

```
Input:
3 3
...
.#.
...
```

```python
import sys
from collections import deque

def main():
    data = sys.stdin.buffer.read().split()
    r = int(data[0]); c = int(data[1])
    grid = [data[2 + i].decode() for i in range(r)]

    if grid[0][0] == '#' or grid[r-1][c-1] == '#':
        print(-1); return

    q = deque([(0, 0, 0)])                   # (row, col, dist)
    seen = {(0, 0)}
    while q:
        x, y, d = q.popleft()
        if x == r - 1 and y == c - 1:
            print(d); return
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < r and 0 <= ny < c and grid[nx][ny] == '.' and (nx, ny) not in seen:
                seen.add((nx, ny))
                q.append((nx, ny, d + 1))
    print(-1)

main()
```
Output:
```
4
```

## Archetype 5 — Top-k by score (TARA-flavored heap)

> *N items, each "name score". Print the top K names by score (highest first); break ties by name ascending.*

```
Input:
5 3
doc_a 0.91
doc_b 0.55
doc_c 0.91
doc_d 0.73
doc_e 0.40
```

```python
import sys
import heapq

def main():
    data = sys.stdin.buffer.read().split()
    n = int(data[0]); k = int(data[1])
    items = []
    idx = 2
    for _ in range(n):
        name = data[idx].decode()
        score = float(data[idx + 1])
        idx += 2
        items.append((name, score))

    # top-k by score DESC, then name ASC.
    # heapq.nlargest with a key handles the primary sort;
    # to also tie-break by name we sort the result deterministically.
    top = heapq.nlargest(k, items, key=lambda it: it[1])
    # nlargest is not guaranteed to break score-ties by name, so re-sort:
    top.sort(key=lambda it: (-it[1], it[0]))

    print(" ".join(name for name, _ in top))   # "doc_a doc_c doc_d"

main()
```

> Note how this mirrors TARA: rank a candidate pool by similarity score and surface the top K. With a large pool you'd keep a size-k heap (`O(n log k)`) instead of sorting everything.

---

# 6. Time-management & debugging for a timed OA

## Triage strategy (do this in the first 2 minutes)

1. **Read all problems first** (if allowed). Note the difficulty and point value. Solve in order of *easiest-first / best points-per-minute*, not in the given order.
2. **For each problem, read constraints before designing.** `n` tells you the target complexity. Don't design an O(n²) plan for `n = 1e5`.
3. **Identify the pattern** using the cheat sheet. Phrase → pattern.
4. **Plan on paper for 60 seconds** before typing. Cheaper than rewriting.

## Per-problem flow

1. Paste your **I/O template** first. Get reading + printing scaffolded.
2. Write the core logic.
3. **Run on the sample input.** If it matches, submit; if not, debug the small case.
4. Mentally test edge cases (below) before submitting — a partial-credit system may run hidden tests.

## Edge cases to always check (these are where OAs trip you)

| Edge case | What to verify |
|---|---|
| **Empty input** (n = 0, empty string/array) | Don't index `arr[0]` blindly; handle gracefully |
| **Single element** (n = 1) | Loops that start at index 1, two-pointer with `lo<hi`, etc. |
| **All duplicates / all same** | dedup, frequency, two-pointer dup-skip logic |
| **Already sorted / reverse sorted** | sorting-based and two-pointer logic |
| **Negative numbers / zeros** | Kadane (all negatives), sums, abs comparisons |
| **Maximum constraints** | does it TLE? did you use `in list` in a loop? |
| **Off-by-one** | inclusive vs exclusive ranges, `range(n)` vs `range(n+1)`, 0- vs 1-indexed output |
| **Target not found / no valid answer** | print the specified sentinel (`-1`, `"NO"`, `0`) exactly |
| **Ties** | did the problem ask for a specific tie-break (smallest index/lexicographic)? |

> **Overflow is NOT a Python concern** — ints are arbitrary precision. The only "overflow-like" issue is the problem explicitly asking for the answer `mod 1e9+7`; then apply the modulus where the statement says.

## Fast debugging moves

- **Print intermediate state** to STDERR so it doesn't pollute your answer: `print(..., file=sys.stderr)`. Remove or it won't matter, but keep STDOUT clean.
- **Re-read the output format** — wrong spacing/case/sentinel is the most common "almost right" WA.
- If TLE: check for `in list`, `list.pop(0)`, `s += ...` in loops, `print` in a tight loop, or an accidental O(n²).
- If WA on big tests only: likely an algorithmic edge case (overflow not it; think ties, off-by-one, or an unhandled empty/extreme case) or a slow path that got cut off — re-check both correctness and speed.
- If it hangs waiting for input: you're reading more tokens than provided (off-by-one in a count) or mixing readers.

## Don't get stuck

- Set a soft per-problem cap (e.g., 20–25 min). If you're stuck, write a **brute force** that passes small tests for partial credit, then move on and return if time allows. A correct slow solution beats a buggy fast one for partial scoring.

---

# 7. ⭐ Python stdlib for DSA cheat

### `collections`
```python
from collections import Counter, defaultdict, deque, OrderedDict

Counter(iterable)              # frequency map; .most_common(k); supports + - & |
defaultdict(int)               # auto 0 for counting
defaultdict(list)              # auto [] for grouping/adjacency lists
defaultdict(set)               # auto set()
deque([...])                   # O(1) appendleft/popleft -> queues, BFS, window
deque(maxlen=k)                # auto-evicts from the other end (fixed window)
```

### `heapq` (min-heap)
```python
import heapq
heapq.heappush(h, x)
heapq.heappop(h)               # smallest
heapq.heapify(lst)             # O(n) in place
heapq.nlargest(k, it, key=...) # top-k
heapq.nsmallest(k, it, key=...)
heapq.heappushpop(h, x)        # push then pop, efficient
# max-heap: push -x and negate on pop, or push (-priority, item)
```

### `bisect` (binary search on a sorted list)
```python
import bisect
bisect.bisect_left(a, x)       # leftmost insertion point (first >= x)
bisect.bisect_right(a, x)      # rightmost insertion point (first > x)
bisect.insort(a, x)            # insert keeping sorted
# count of x: bisect_right - bisect_left ; count <= x: bisect_right
```

### `itertools`
```python
from itertools import permutations, combinations, product, accumulate, groupby, chain, count

permutations(it, r)            # all orderings
combinations(it, r)            # all r-subsets
product(a, b)                  # cartesian product; product(range(2), repeat=n) for bitmasks
accumulate(it)                 # running prefix sums (accumulate(it, max) for running max)
groupby(sorted_it, key)        # consecutive groups by key (sort first!)
chain(a, b)                    # flatten iterables
count(start, step)             # infinite counter
```

### `math`
```python
import math
math.gcd(a, b); math.lcm(a, b)
math.isqrt(n)                  # integer sqrt, exact, no float error
math.comb(n, k); math.perm(n, k); math.factorial(n)
math.inf                       # float('inf')
math.ceil(a / b)               # or use -(-a // b) for integer ceil without floats
```

### `functools`
```python
from functools import lru_cache, cmp_to_key, reduce
@lru_cache(maxsize=None)       # memoize a recursive function -> easy top-down DP
cmp_to_key(cmp)                # custom comparator for sort()
reduce(func, iterable, init)   # fold (e.g., reduce(operator.xor, nums))
```

### Built-ins worth remembering
```python
sorted(it, key=..., reverse=...)
enumerate(it, start=0)         # index + value
zip(a, b)                      # pair up; zip(*matrix) transposes
any(...) / all(...)            # short-circuit boolean reduce
sum(it) / min(it) / max(it, key=...)
divmod(a, b)                   # (a // b, a % b)
ord(ch) / chr(n)               # char <-> code point ('a'==97)
int(s, base)                   # parse in a given base
list(map(int, line.split()))   # the read-a-row idiom
```

### Integer-ceiling without floats (handy, avoids precision bugs)
```python
ceil_div = -(-a // b)          # equals math.ceil(a / b) but pure integer
```

---

# 8. ⭐ Final 30-minute-before-OA checklist

**I/O (the thing that causes the most avoidable losses):**
- [ ] I can type the `sys.stdin.buffer.read().split()` + `nxt()` template from memory.
- [ ] I know `input = sys.stdin.readline` for a quick speedup, and to `.strip()` strings.
- [ ] I will **buffer output** into a list and write once for multi-test-case problems.
- [ ] I'll match the **exact** output format: spacing, case of `YES/NO`, sentinel values, float precision.

**Speed reflexes:**
- [ ] Membership test in a loop → `set`/`dict`, never `in list`.
- [ ] Queue/front-removal → `collections.deque`, never `list.pop(0)`.
- [ ] Building a string → list + `"".join`, never `+=` in a loop.
- [ ] Look at `n` first → pick target complexity (1e5 → O(n log n); 1e6 → O(n)).

**Pattern triggers I can recall instantly:**
- [ ] complement/seen → hashmap; frequency → Counter; distinct → set.
- [ ] contiguous + condition → sliding window; sorted + pair → two pointers.
- [ ] top-k / k-th → heap (`nlargest`/size-k heap); "minimize the max / feasible?" → binary search on answer.
- [ ] next greater / parentheses → stack; shortest unweighted path / level order → BFS.
- [ ] intervals → sort + sweep; prerequisites → topological sort.

**Core snippets I can write without thinking:**
- [ ] Two-sum hashmap, Kadane, prefix sums.
- [ ] Sliding-window (longest unique substring) template.
- [ ] Binary search (manual) + `bisect` usage.
- [ ] BFS/DFS on adjacency list and on a grid.
- [ ] heapq top-k; reverse linked list; merge two sorted lists; Floyd cycle.
- [ ] Counter/defaultdict idioms.

**Test discipline before each submit:**
- [ ] Run the provided sample(s) and match exactly.
- [ ] Mentally test: empty, single element, all duplicates, not-found, max size.
- [ ] Remove any stray debug prints from STDOUT.

**Mindset:**
- [ ] Read constraints before designing. Plan 60 seconds on paper.
- [ ] Easiest/highest-value first. Soft cap ~20–25 min per problem.
- [ ] Stuck? Write the brute force for partial credit, move on, return later.
- [ ] A correct slow solution beats a buggy fast one in partial scoring.

> **You've got this.** The OA rewards pattern recognition + clean I/O + not over-thinking. Match the phrasing to a pattern, paste the template, test the sample, submit, move on.
