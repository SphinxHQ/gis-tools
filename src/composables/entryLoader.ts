/**
 * 主入口 loading 屏控制
 *
 * 背景：地图初始化涉及 proj4 注册、瓦片探测、底图加载等，
 *       整个过程可能持续数秒。Vite 在 ESM 模式下不会阻塞 HTML 解析，
 *       但 `<div id="app">` 在挂载完成前是空的，会出现"白屏"。
 *
 * 方案：
 *   1. 在 index.html 中直接渲染一个纯 HTML+CSS 的 loading 屏（不依赖任何 JS）
 *   2. main.ts 启动时调用 showEntryLoader() 启动假进度
 *   3. GisMapBase 初始化完成后调用 hideEntryLoader() 移除遮罩
 *
 * 进度策略（用户要求）：
 *   - 强制播放至少 5 秒
 *   - 5 秒跑完卡在 98%
 *   - 等真实加载完成才到 100% 然后淡出
 *
 * 提示语策略：绑定到进度节点触发
 *   - 0%   → 正在加载地图核心模块
 *   - 18%  → 正在注册投影坐标系
 *   - 36%  → 正在构建地图视图
 *   - 54%  → 正在加载底图服务
 *   - 72%  → 正在绑定交互事件
 *   - 90%+ → 即将完成，请稍后
 */

let fakeStartTs = 0
let fakeRafId: number | null = null
let hideStarted = false
let lastTipIdx = -1

const FAKE_DURATION_MS = 5000
const FAKE_TARGET = 98

/**
 * 提示语节点：进度跨过 at% 阈值时切换到对应文案
 * 区间采用左闭右开（at 升序），最后一个节点从 at% 一直保持到加载完成
 */
const TIPS: { at: number; text: string }[] = [
  { at: 0, text: '正在加载地图核心模块' },
  { at: 18, text: '正在注册投影坐标系' },
  { at: 36, text: '正在构建地图视图' },
  { at: 54, text: '正在加载底图服务' },
  { at: 72, text: '正在绑定交互事件' },
  { at: 90, text: '即将完成，请稍后' },
]

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function pickTipIndex(percent: number): number {
  let idx = 0
  for (let i = 0; i < TIPS.length; i++) {
    if (percent >= TIPS[i].at) idx = i
  }
  return idx
}

/**
 * 文字通道：所有文字（包括百分比与提示语）都通过 Canvas 2D 绘制。
 * 我们只更新 window.__loaderText 这个数据通道，Canvas 帧循环读取后绘制，
 * 不再触碰 DOM 文本节点，避免主进程 reflow 卡顿。
 */
declare global {
  interface Window {
    __loaderText?: { percent: string; tip: string }
  }
}

function pushLoaderText(percent: string, tip: string): void {
  if (typeof window === 'undefined') return
  window.__loaderText = { percent, tip }
}

function tickFakeLoading(ts: number): void {
  if (!fakeStartTs) fakeStartTs = ts
  const elapsed = ts - fakeStartTs
  const t = Math.min(elapsed / FAKE_DURATION_MS, 1)
  const value = Math.floor(easeOutCubic(t) * FAKE_TARGET)
  // 按进度阈值切换提示语
  const tipIdx = pickTipIndex(value)
  const tipText = TIPS[tipIdx].text
  if (tipIdx !== lastTipIdx) {
    lastTipIdx = tipIdx
  }
  pushLoaderText(value + '%', tipText)
  if (t >= 1) {
    pushLoaderText(FAKE_TARGET + '%', tipText)
    fakeRafId = null
    return
  }
  fakeRafId = requestAnimationFrame(tickFakeLoading)
}

/**
 * 启动假进度动画（由 main.ts 在挂载时触发）
 */
export function showEntryLoader(): void {
  if (typeof window === 'undefined') return
  if (hideStarted) return
  const mask = document.getElementById('entry-loader-mask')
  if (!mask) return
  mask.classList.remove('entry-loader-hide')
  fakeStartTs = 0
  lastTipIdx = -1
  if (fakeRafId) cancelAnimationFrame(fakeRafId)
  // 重置文字通道（Canvas 会自动读取最新值）
  pushLoaderText('0%', TIPS[0].text)
  fakeRafId = requestAnimationFrame(tickFakeLoading)
}

/**
 * 隐藏入口 loading 屏：先到 100% 短暂停留，再淡出
 */
export function hideEntryLoader(): void {
  if (typeof window === 'undefined') return
  hideStarted = true
  const mask = document.getElementById('entry-loader-mask')
  if (!mask) return
  // 调试日志：确认 hide 流程被触发
  // eslint-disable-next-line no-console
  console.info('[entryLoader] hide start')
  if (fakeRafId) {
    cancelAnimationFrame(fakeRafId)
    fakeRafId = null
  }
  const tipText = '欢迎使用 GIS Tools'
  pushLoaderText('100%', tipText)
  // 立即停止 SVG 内部 SMIL 动画
  mask.querySelectorAll<SVGElement>('svg').forEach((svg) => {
    try { svg.pauseAnimations?.() } catch { /* noop */ }
  })
  // 350ms 后开始淡出
  window.setTimeout(() => {
    mask.classList.add('entry-loader-hide')
    // 600ms 后强制 display:none 并从 DOM 移除（兜底）
    window.setTimeout(() => {
      if (mask.parentElement) {
        mask.style.display = 'none'
        mask.parentElement.removeChild(mask)
        // eslint-disable-next-line no-console
        console.info('[entryLoader] mask removed')
      }
    }, 600)
  }, 350)
}
