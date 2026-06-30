// ============================================================
// 采集脚本 v1 - 统一 Schema
// 来源: scene1-xx-1920x1080.json 实际采集方法
// 说明: 所有场景统一使用本脚本采集，确保字段一致
// ============================================================

(function() {
  // 视口大小
  var vp = window.innerWidth + 'x' + window.innerHeight;

  // 单个元素的采集函数
  var r = function(el) {
    if (!el) return null;

    var rect = el.getBoundingClientRect();

    // 过滤掉 0 尺寸元素
    if (rect.width < 1 || rect.height < 1) return null;

    var s = window.getComputedStyle(el);

    // 类名白名单匹配
    var cn = 'unknown';
    if (el.className && typeof el.className === 'string') {
      var cls = el.className.split(' ');
      for (var i = 0; i < cls.length; i++) {
        var c = cls[i];
        if (c.match(/^(el-|gis-|top-|left-|main-|empty-|upload-|map-|mobile-|dialog-|crs-|feature-|validator-|export-|data-|history-|mobile-info|monaco-editor)/)) {
          cn = c;
          break;
        }
      }
    }

    // 返回 5 个固定字段
    return {
      component: cn,
      tag: el.tagName,
      rect: {
        w: Math.round(rect.width),
        h: Math.round(rect.height),
        x: Math.round(rect.left),
        y: Math.round(rect.top)
      },
      scrollable: el.scrollHeight > el.clientHeight,
      overflowY: s.overflowY
    };
  };

  // 采集的元素类型白名单
  var tags = ['div', 'button', 'span', 'textarea', '[role=dialog]'];

  // 去重 key
  var seen = {};

  // 结果数组
  var result = [];

  // 遍历所有匹配元素
  tags.forEach(function(sel) {
    try {
      var els = document.querySelectorAll(sel);
      els.forEach(function(el) {
        var key = (el.className || '') + '_' + el.tagName + '_' +
                  Math.round(el.getBoundingClientRect().left) + '_' +
                  Math.round(el.getBoundingClientRect().top);
        if (!seen[key] && el.offsetParent !== null) {
          seen[key] = true;
          var data = r(el);
          if (data) result.push(data);
        }
      });
    } catch (e) {}
  });

  // 返回 JSON 字符串
  return JSON.stringify({
    viewport: vp,
    scene: '当前场景名称',
    timestamp: '2026-06-25',
    采集方法: 'evaluate_script 组件白名单遍历',
    schema: 'v1',
    count: result.length,
    elements: result
  }, null, 2);
})();

// ============================================================
// Schema v1 字段说明
// ============================================================
// component: string  - 元素类名（白名单匹配，否则 unknown）
// tag: string        - 元素标签名 (DIV, BUTTON, SPAN, TEXTAREA, ...)
// rect.w: number     - 元素宽度（像素）
// rect.h: number     - 元素高度（像素）
// rect.x: number     - 元素左上角 X 坐标（相对视口）
// rect.y: number     - 元素左上角 Y 坐标（相对视口）
// scrollable: bool   - 是否可垂直滚动（scrollHeight > clientHeight）
// overflowY: string  - overflowY CSS 属性值（visible/hidden/auto/scroll）
//
// 类名匹配正则:
// ^(el-|gis-|top-|left-|main-|empty-|upload-|map-|mobile-|
//   dialog-|crs-|feature-|validator-|export-|data-|history-|
//   mobile-info|monaco-editor)
//
// 元素类型:
// div, button, span, textarea, [role=dialog]
//
// 过滤规则:
// - width < 1 || height < 1: 跳过
// - offsetParent === null: 跳过（display:none）
// - 同位置同 class 同 tag: 去重
// ============================================================