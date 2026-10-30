/** 风格元数据：切换器、设置页与文档共用同一份定义，避免两处写死四份文案 */
import type { StyleKey } from '@/types'

export interface StyleOption {
  key: StyleKey
  label: string
  en: string
  desc: string
  /** 预览色板：[底色, 纸面, 强调色, 文字色] */
  swatches: [string, string, string, string]
}

export const STYLE_OPTIONS: StyleOption[] = [
  {
    key: 'campus',
    label: '青春校园',
    en: 'Campus',
    desc: '天空渐变、黑板与软木板，彩纸便签、拍立得和手绘下划线，像一本热闹的班级手账。',
    swatches: ['#dff0fb', '#fff9ec', '#ffce54', '#33475b'],
  },
  {
    key: 'annual',
    label: '纸质年鉴',
    en: 'Almanac',
    desc: '米白稿纸、细线分隔、衬线标题、方形徽标，像一本装帧克制的学校年刊。',
    swatches: ['#faf9f6', '#ffffff', '#ab5c19', '#16283d'],
  },
  {
    key: 'japandi',
    label: 'Japandi',
    en: 'Japandi',
    desc: '雾白与鼠尾草绿，大留白、圆润几何、柔和长阴影，安静治愈。',
    swatches: ['#f7f5f0', '#fffefb', '#a85f43', '#3d4a42'],
  },
  {
    key: 'brutal',
    label: '硬边杂志',
    en: 'Brutalist',
    desc: '3px 黑边、硬投影、高饱和撞色，按下去会物理位移，适合高三冲刺。',
    swatches: ['#f5f0e1', '#fffdf7', '#ffd23f', '#111111'],
  },
  {
    key: 'legacy',
    label: '原版',
    en: 'Original',
    desc: '深色优先的玻璃拟态、粉紫渐变与弹性动效 —— 保留改动前的熟悉界面。',
    swatches: ['#f0ecfa', '#ffffff', '#2563eb', '#241f33'],
  },
]

export const STYLE_LABEL: Record<StyleKey, string> = {
  campus: '青春校园',
  annual: '纸质年鉴',
  japandi: 'Japandi',
  brutal: '硬边杂志',
  legacy: '原版',
}
