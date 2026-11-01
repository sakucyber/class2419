/**
 * 外观元数据（单一事实来源）。
 *
 * 风格切换器、抽屉、设置页与页脚都从这里取文案与图标，
 * 避免同一份「主题 / 强调色 / 字号」定义在四个组件里各写一遍。
 */
import type { IconName } from '@/components/common/icons'
import type { AccentKey, FontSizeKey, StyleKey, ThemeMode } from '@/types'

/* ------------------------------------------------------------------ */
/* 视觉风格                                                            */
/* ------------------------------------------------------------------ */

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

export const STYLE_LABEL: Record<StyleKey, string> = Object.fromEntries(
  STYLE_OPTIONS.map((option) => [option.key, option.label]),
) as Record<StyleKey, string>

/** 顶栏 / 抽屉 / 页脚上的班号徽标：不同风格用不同的字形 */
export function classMark(style: StyleKey): string {
  if (style === 'brutal') return '19'
  if (style === 'legacy') return '2419'
  return '叁'
}

/* ------------------------------------------------------------------ */
/* 主题 / 强调色 / 字号                                                */
/* ------------------------------------------------------------------ */

export interface ThemeOption {
  key: ThemeMode
  /** 按钮上的短标签 */
  label: string
  /** 悬浮提示与无障碍名称 */
  title: string
  icon: IconName
}

/**
 * 顺序即设置页的展示顺序（亮 → 暗 → 跟随）。
 * 头部按钮的循环顺序由 settings store 决定，与此无关。
 */
export const THEME_OPTIONS: ThemeOption[] = [
  { key: 'light', label: '亮色', title: '主题：亮色', icon: 'sun' },
  { key: 'dark', label: '暗色', title: '主题：暗色', icon: 'moon' },
  { key: 'auto', label: '跟随系统', title: '主题：跟随系统', icon: 'monitor' },
]

export const THEME_BY_KEY = Object.fromEntries(
  THEME_OPTIONS.map((option) => [option.key, option]),
) as Record<ThemeMode, ThemeOption>

export interface AccentOption {
  key: AccentKey
  label: string
  /** 色板圆点；「随风格」没有固定颜色，用四色小方块代替 */
  color: string
}

export const ACCENT_OPTIONS: AccentOption[] = [
  { key: 'auto', label: '随风格', color: '' },
  { key: 'blue', label: '晴空蓝', color: '#1f56d6' },
  { key: 'green', label: '常青绿', color: '#0d7a6f' },
  { key: 'orange', label: '活力橙', color: '#b8560f' },
  { key: 'pink', label: '樱花粉', color: '#b04a80' },
]

export interface FontSizeOption {
  key: FontSizeKey
  label: string
}

export const FONT_SIZE_OPTIONS: FontSizeOption[] = [
  { key: 'sm', label: '小' },
  { key: 'md', label: '标准' },
  { key: 'lg', label: '大' },
]
