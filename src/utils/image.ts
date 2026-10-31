/** 媒体下载工具（原图片上传相关的压缩/选文件逻辑随「管理后台」一起下线了） */
import imageDims from '@/data/image-dims.json'

/**
 * 图片的固有尺寸（px），没有记录时返回 null。
 *
 * 尺寸表由 `scripts/gen-image-dims.py` 扫描 public/images 生成：
 * 以后新照片放进 public/images/ 后重跑一次脚本即可，不必手工改数据。
 */
export function getImageSize(src: string): { width: number; height: number } | null {
  const entry = (imageDims as unknown as Record<string, [number, number]>)[src]
  if (!entry) return null
  return { width: entry[0], height: entry[1] }
}

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
