/** 媒体下载工具（原图片上传相关的压缩/选文件逻辑随「管理后台」一起下线了） */

/** 触发文件下载（同源 / dataURL / blob 均可；跨域失败时新开标签页） */
export async function downloadMedia(url: string, filename: string): Promise<void> {
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) throw new Error('fetch failed')
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(objectUrl)
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}
