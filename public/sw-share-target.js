/**
 * Web Share Target Service Worker 拦截脚本
 *
 * 由 vite-plugin-pwa 的 workbox.importScripts 引入，在 workbox 生成的 SW 初始化后执行。
 * 注册独立的 fetch 监听器拦截系统分享的 POST 请求，暂存文件到 Cache Storage，
 * 再 303 重定向到首页由应用层读取处理。
 *
 * 与 workbox 自身 fetch 监听器的共存关系：
 *   - workbox 对未匹配已注册路由的请求不调用 event.respondWith，直接放行
 *   - 本监听器仅匹配 POST /gis-tools/share-receiver，匹配时调用 respondWith 并 return
 *   - 两者互不干扰
 *
 * 文件存储策略（关键修正）：
 *   - 用户示例代码中 JSON.stringify(payload) 含 File 对象会丢失二进制数据
 *   - 本实现将元数据与文件分离存储：
 *     · 元数据（title/text/url/timestamp/fileCount/fileNames）→ JSON Response → key: /gis-tools/share-pending-meta
 *     · 每个文件 → 独立 Blob Response → key: /gis-tools/share-pending-file-{index}
 *   - 页面端 useShareReceiver 按此结构读取
 */
;(function () {
  'use strict'

  /** 分享数据暂存的 Cache Storage 名称 */
  var SHARE_CACHE = 'share-data-cache'
  /** 分享接收路径（与 manifest.share_target.action 一致） */
  var SHARE_ACTION = '/gis-tools/share-receiver'
  /** 元数据缓存 key */
  var META_KEY = '/gis-tools/share-pending-meta'
  /** 文件缓存 key 前缀 */
  var FILE_KEY_PREFIX = '/gis-tools/share-pending-file-'
  /** 重定向基础路径（与 vite base 一致） */
  var BASE_PATH = '/gis-tools/'

  /**
   * 拦截系统分享的 POST 请求
   * 流程：读取 formData → 暂存元数据+文件 → 303 重定向到 /?share=1
   */
  self.addEventListener('fetch', function (event) {
    var url = new URL(event.request.url)

    // 仅拦截分享目标的 POST 请求，其他请求交给 workbox 处理
    if (url.pathname !== SHARE_ACTION || event.request.method !== 'POST') {
      return
    }

    event.respondWith(handleShareRequest(event.request))
  })

  /**
   * 处理分享请求：暂存数据并重定向
   * @param {Request} request - 原始 POST 请求
   * @returns {Promise<Response>} 303 重定向响应
   */
  async function handleShareRequest(request) {
    try {
      // 1. 读取表单数据（包含分享的文件、文本、标题等）
      var formData = await request.formData()
      var sharedFiles = formData.getAll('files') // File 对象数组
      var sharedTitle = formData.get('title') || ''
      var sharedText = formData.get('text') || ''
      var sharedUrl = formData.get('url') || ''

      // 过滤掉空文件名项（部分系统会发送空占位）
      var validFiles = sharedFiles.filter(function (f) {
        return f && f instanceof File && f.size > 0
      })

      // 2. 暂存到 Cache Storage
      var shareCache = await caches.open(SHARE_CACHE)

      // 2.1 暂存元数据（JSON）
      var meta = {
        title: sharedTitle,
        text: sharedText,
        url: sharedUrl,
        timestamp: Date.now(),
        fileCount: validFiles.length,
        fileNames: validFiles.map(function (f) { return f.name }),
        fileTypes: validFiles.map(function (f) { return f.type }),
      }
      await shareCache.put(
        META_KEY,
        new Response(JSON.stringify(meta), {
          headers: { 'Content-Type': 'application/json' },
        })
      )

      // 2.2 逐个暂存文件（独立 Blob Response，保留二进制数据）
      for (var i = 0; i < validFiles.length; i++) {
        await shareCache.put(
          FILE_KEY_PREFIX + i,
          new Response(validFiles[i])
        )
      }

      // 3. 303 重定向到首页，带 share=1 标记通知页面读取
      return Response.redirect(BASE_PATH + '?share=1', 303)
    } catch (err) {
      // 暂存失败时重定向到首页并带错误标记，避免用户卡在空白页
      console.error('[sw-share-target] 暂存分享数据失败:', err)
      return Response.redirect(BASE_PATH + '?share=error', 303)
    }
  }
})()
