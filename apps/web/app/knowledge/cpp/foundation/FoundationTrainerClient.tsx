"use client"

import { useMemo, useState } from "react"

type OpKind = "equal" | "replace" | "insert" | "delete"

type DiffOp = {
  kind: OpKind
  actual?: string
  expected?: string
}

type JudgeResult = {
  ok: boolean
  variantRaw: string
  ops: DiffOp[]
}

type Drill = {
  id: string
  title: string
  goal: string
  tip: string
  variants: string[]
  sample: string
}

const drills: Drill[] = [
  {
    id: "include",
    title: "第 1 关：头文件",
    goal: "默写万能头文件语句",
    tip: "写出头文件语句；空格和换行都不影响判题。",
    variants: ["#include<bits/stdc++.h>"],
    sample: "#include <bits/stdc++.h>"
  },
  {
    id: "namespace",
    title: "第 2 关：命名空间",
    goal: "默写命名空间语句",
    tip: "需要包含三个部分，并且结尾有分号。",
    variants: ["using namespace std;"],
    sample: "using namespace std;"
  },
  {
    id: "main",
    title: "第 3 关：主函数",
    goal: "写出主函数框架（return 0 可选）",
    tip: "只要主函数结构正确就算通过。",
    variants: ["int main(){}", "int main(){return 0;}"],
    sample: "int main() {\n\n}"
  },
  {
    id: "cout",
    title: "第 4 关：输出语句",
    goal: "在主函数里输出指定内容",
    tip: '本关要求输出：Hello KidsCode',
    variants: [
      'int main(){cout<<"Hello KidsCode";}',
      'int main(){cout<<"Hello KidsCode";return 0;}'
    ],
    sample: 'int main() {\n  cout << "Hello KidsCode";\n}'
  },
  {
    id: "full",
    title: "第 5 关：整段默写",
    goal: "默写完整基础模板（return 0 可选）",
    tip: '顺序必须是 头文件 -> 命名空间 -> 主函数，并输出 Hello KidsCode。',
    variants: [
      '#include<bits/stdc++.h>using namespace std;int main(){cout<<"Hello KidsCode";}',
      '#include<bits/stdc++.h>using namespace std;int main(){cout<<"Hello KidsCode";return 0;}'
    ],
    sample:
      '#include<bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  cout << "Hello KidsCode";\n}'
  }
]

function normalize(input: string) {
  return input.replace(/\s+/g, "")
}

function buildDiff(actual: string, expected: string): DiffOp[] {
  const a = actual.split("")
  const b = expected.split("")
  const m = a.length
  const n = b.length

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i += 1) dp[i][0] = i
  for (let j = 0; j <= n; j += 1) dp[0][j] = j

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const same = a[i - 1] === b[j - 1]
      const replaceCost = dp[i - 1][j - 1] + (same ? 0 : 1)
      const insertCost = dp[i - 1][j] + 1
      const deleteCost = dp[i][j - 1] + 1
      dp[i][j] = Math.min(replaceCost, insertCost, deleteCost)
    }
  }

  const ops: DiffOp[] = []
  let i = m
  let j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const same = a[i - 1] === b[j - 1]
      const diag = dp[i - 1][j - 1] + (same ? 0 : 1)
      if (dp[i][j] === diag) {
        ops.push({
          kind: same ? "equal" : "replace",
          actual: a[i - 1],
          expected: b[j - 1]
        })
        i -= 1
        j -= 1
        continue
      }
    }
    if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      ops.push({ kind: "insert", actual: a[i - 1] })
      i -= 1
      continue
    }
    ops.push({ kind: "delete", expected: b[j - 1] })
    j -= 1
  }

  return ops.reverse()
}

function pickBestDiff(actualRaw: string, variantsRaw: string[]): JudgeResult {
  const actual = normalize(actualRaw)
  let best: JudgeResult | null = null

  for (const variantRaw of variantsRaw) {
    const expected = normalize(variantRaw)
    const ops = buildDiff(actual, expected)
    const bad = ops.filter(op => op.kind !== "equal").length
    const current: JudgeResult = {
      ok: bad === 0,
      variantRaw,
      ops
    }
    if (!best) {
      best = current
      continue
    }
    const bestBad = best.ops.filter(op => op.kind !== "equal").length
    if (bad < bestBad) best = current
  }

  return best ?? { ok: false, variantRaw: variantsRaw[0] ?? "", ops: [] }
}

export default function FoundationTrainerClient() {
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState("")
  const [result, setResult] = useState<JudgeResult | null>(null)

  const drill = drills[index]
  const progress = useMemo(() => `${index + 1} / ${drills.length}`, [index])

  const onCheck = () => {
    setResult(pickBestDiff(input, drill.variants))
  }

  const onPrev = () => {
    setIndex(i => Math.max(0, i - 1))
    setInput("")
    setResult(null)
  }

  const onNext = () => {
    setIndex(i => Math.min(drills.length - 1, i + 1))
    setInput("")
    setResult(null)
  }

  const onFillSample = () => {
    setInput(drill.sample)
    setResult(null)
  }

  return (
    <section className="mt-6 grid gap-5">
      <div className="rounded-3xl border border-black/5 bg-white/70 p-5 shadow-sm dark:border-white/10 dark:bg-zinc-950/50">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
              语法训练营
            </div>
            <h2 className="mt-2 text-xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
              {drill.title}
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{drill.goal}</p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{drill.tip}</p>
          </div>
          <div className="rounded-full border border-black/10 px-3 py-1 text-sm font-bold text-zinc-700 dark:border-white/10 dark:text-zinc-200">
            {progress}
          </div>
        </div>

        <textarea
          value={input}
          onChange={e => {
            setInput(e.target.value)
            if (result) setResult(null)
          }}
          className="mt-4 min-h-56 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 font-mono text-sm leading-7 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/50"
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCheck}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-bold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            开始判题
          </button>
          <button
            type="button"
            onClick={onFillSample}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 px-4 text-sm font-bold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5"
          >
            填入示例
          </button>
          <button
            type="button"
            onClick={onPrev}
            disabled={index === 0}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 px-4 text-sm font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5"
          >
            上一关
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={index >= drills.length - 1}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 px-4 text-sm font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5"
          >
            下一关
          </button>
        </div>

        {result ? (
          <div className="mt-4 rounded-2xl border border-black/10 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-900/40">
            <div
              className={`text-sm font-bold ${
                result.ok
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-zinc-700 dark:text-zinc-200"
              }`}
            >
              {result.ok ? "通过，写得很规范。" : "未通过，请按颜色提示修改。"}
            </div>

            {result.ok ? (
              <>
                <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 font-mono text-sm leading-7 text-emerald-700 dark:text-emerald-200">
                  {input}
                </pre>
                <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">推荐格式：</div>
                <pre className="mt-1 whitespace-pre-wrap rounded-xl border border-black/10 bg-white p-3 font-mono text-sm leading-7 text-zinc-700 dark:border-white/10 dark:bg-zinc-950/50 dark:text-zinc-200">
                  {drill.sample}
                </pre>
              </>
            ) : (
              <div className="mt-3 rounded-xl border border-black/10 bg-white p-3 font-mono text-sm leading-7 dark:border-white/10 dark:bg-zinc-950/50">
                {result.ops.length === 0 ? (
                  <span className="text-zinc-400">暂无对比结果</span>
                ) : (
                  result.ops.map((op, idx) => {
                    if (op.kind === "equal") {
                      return (
                        <span key={idx} className="text-emerald-600 dark:text-emerald-300">
                          {op.actual}
                        </span>
                      )
                    }
                    if (op.kind === "replace") {
                      return (
                        <span key={idx} className="text-amber-500 dark:text-amber-300">
                          {op.actual}
                        </span>
                      )
                    }
                    if (op.kind === "insert") {
                      return (
                        <span
                          key={idx}
                          className="text-zinc-400 line-through dark:text-zinc-500"
                        >
                          {op.actual}
                        </span>
                      )
                    }
                    return (
                      <span key={idx} className="text-red-500 dark:text-red-300">
                        {op.expected}
                      </span>
                    )
                  })
                )}
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs">
              <span className="text-emerald-700 dark:text-emerald-300">绿色：正确</span>
              <span className="text-amber-600 dark:text-amber-300">黄色：错误</span>
              <span className="text-zinc-500 dark:text-zinc-400">灰色删除线：多写</span>
              <span className="text-red-600 dark:text-red-300">红色：缺少</span>
            </div>

            {result.ok ? (
              <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                本关通过，可进入下一关。
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}
