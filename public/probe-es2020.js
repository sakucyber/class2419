/*
 * 现代语法探针（本文件刻意使用 ES2020 语法）。
 *
 * 原理：能解析这个文件的浏览器会执行它并把标志位置为 true；
 * 解析不了的旧内核（如 Chrome 79 及以下不支持可选链）会直接放弃执行，
 * window.__modernSyntax 保持 undefined —— 于是「标志位在不在」就成了语法能力探测结果。
 *
 * 为什么不用 new Function / eval 做探测：生产构建注入了 CSP `script-src 'self'`，
 * 会拦截 eval，new Function 直接抛错，结果所有浏览器都被误判成旧内核（已踩过这个坑）。
 *
 * 本文件放在 public/ 下，构建时原样复制，不会被转译降级。
 */
window.__modernSyntax = ({}).a?.b === undefined && (null ?? 1) === 1
