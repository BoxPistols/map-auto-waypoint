import type { ComponentType } from 'react'
import { useEffect } from 'react'
import '../src/styles/theme.scss'
import '../src/App.scss'

type ThemeMode = 'light' | 'dark'
type StoryGlobals = {
  theme?: ThemeMode
}
type StoryContext = {
  globals: StoryGlobals
}

const withTheme = (Story: ComponentType, context: StoryContext) => {
  const theme = context.globals.theme ?? 'light'

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.style.colorScheme = theme
    document.body.style.backgroundColor = 'var(--color-bg)'
    document.body.style.color = 'var(--color-text)'
  }, [theme])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <Story />
    </div>
  )
}

export const globalTypes = {
  theme: {
    name: 'テーマ',
    description: 'ストーリーブックのカラースキーム切替',
    defaultValue: 'light',
    toolbar: {
      icon: 'circlehollow',
      items: [
        { value: 'light', title: 'ライト' },
        { value: 'dark', title: 'ダーク' },
      ],
      dynamicTitle: true,
    },
  },
}

export const decorators = [withTheme]
