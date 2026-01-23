import type { Meta, StoryObj } from '@storybook/react-vite'
import ControlGroup from './ControlGroup'
import { ShieldAlert, Plane, Users, Signal } from 'lucide-react'
import { useState } from 'react'

/**
 * ControlGroupはマップコントロールのグループ化コンポーネントです。
 * Issue #29で実装された以下の機能を提供します：
 * - グループ全体のON/OFF機能
 * - お気に入り機能
 * - 開閉状態のlocalStorage永続化
 */
const meta: Meta<typeof ControlGroup> = {
  title: 'Map/ControlGroup',
  component: ControlGroup,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'マップレイヤーグループ管理コンポーネント。グループトグル、お気に入り、永続化機能を搭載。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    groupToggle: {
      control: 'boolean',
      description: 'グループ全体のON/OFF機能を有効化',
    },
    favoritable: {
      control: 'boolean',
      description: 'お気に入り機能を有効化',
    },
    defaultExpanded: {
      control: 'boolean',
      description: '初期展開状態',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '280px', padding: '20px', background: '#1a1a1a' }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

/**
 * 基本的なグループ（展開/折りたたみのみ）
 */
export const Basic: Story = {
  args: {
    id: 'basic-group',
    icon: <ShieldAlert size={18} />,
    label: '基本グループ',
    defaultExpanded: true,
    children: (
      <>
        <button style={{ padding: '8px', margin: '4px 0', width: '100%' }}>
          オプション1
        </button>
        <button style={{ padding: '8px', margin: '4px 0', width: '100%' }}>
          オプション2
        </button>
      </>
    ),
  },
}

/**
 * グループトグル機能付き
 */
export const WithGroupToggle: Story = {
  render: (args) => {
    const [enabled, setEnabled] = useState(false)
    return (
      <ControlGroup
        {...args}
        groupEnabled={enabled}
        onGroupToggle={setEnabled}
      />
    )
  },
  args: {
    id: 'toggle-group',
    icon: <Plane size={18} />,
    label: '航空制限',
    defaultExpanded: true,
    groupToggle: true,
    children: (
      <>
        <button style={{ padding: '8px', margin: '4px 0', width: '100%' }}>
          空港エリア
        </button>
        <button style={{ padding: '8px', margin: '4px 0', width: '100%' }}>
          ヘリポート
        </button>
      </>
    ),
  },
}

/**
 * お気に入り機能付き
 */
export const WithFavorite: Story = {
  render: (args) => {
    const [favorite, setFavorite] = useState(false)
    return (
      <ControlGroup
        {...args}
        isFavorite={favorite}
        onFavoriteToggle={setFavorite}
      />
    )
  },
  args: {
    id: 'favorite-group',
    icon: <Users size={18} />,
    label: '環境',
    defaultExpanded: true,
    favoritable: true,
    children: (
      <>
        <button style={{ padding: '8px', margin: '4px 0', width: '100%' }}>
          DID
        </button>
        <button style={{ padding: '8px', margin: '4px 0', width: '100%' }}>
          地形
        </button>
      </>
    ),
  },
}

/**
 * 全機能有効（グループトグル + お気に入り）
 */
export const FullFeatured: Story = {
  render: (args) => {
    const [enabled, setEnabled] = useState(true)
    const [favorite, setFavorite] = useState(true)
    return (
      <ControlGroup
        {...args}
        groupEnabled={enabled}
        onGroupToggle={setEnabled}
        isFavorite={favorite}
        onFavoriteToggle={setFavorite}
      />
    )
  },
  args: {
    id: 'full-group',
    icon: <ShieldAlert size={18} />,
    label: '禁止区域',
    defaultExpanded: true,
    groupToggle: true,
    favoritable: true,
    children: (
      <>
        <button style={{ padding: '8px', margin: '4px 0', width: '100%', background: '#dc2626', border: 'none', color: 'white', borderRadius: '4px' }}>
          🔴 レッドゾーン
        </button>
        <button style={{ padding: '8px', margin: '4px 0', width: '100%', background: '#eab308', border: 'none', color: 'white', borderRadius: '4px' }}>
          🟡 イエローゾーン
        </button>
        <button style={{ padding: '8px', margin: '4px 0', width: '100%', background: '#f97316', border: 'none', color: 'white', borderRadius: '4px' }}>
          ☢️ 原子力施設
        </button>
      </>
    ),
  },
}

/**
 * 折りたたみ状態
 */
export const Collapsed: Story = {
  args: {
    id: 'collapsed-group',
    icon: <Signal size={18} />,
    label: '通信カバレッジ',
    defaultExpanded: false,
    children: (
      <>
        <button style={{ padding: '8px', margin: '4px 0', width: '100%' }}>
          LTE
        </button>
        <button style={{ padding: '8px', margin: '4px 0', width: '100%' }}>
          5G
        </button>
      </>
    ),
  },
}

/**
 * 実際の使用例（複数グループ）
 */
export const MultipleGroups: Story = {
  render: () => {
    const [restrictedEnabled, setRestrictedEnabled] = useState(true)
    const [restrictedFavorite, setRestrictedFavorite] = useState(true)
    const [aviationEnabled, setAviationEnabled] = useState(false)
    const [aviationFavorite, setAviationFavorite] = useState(false)

    return (
      <div style={{ width: '280px' }}>
        <ControlGroup
          id="restricted"
          icon={<ShieldAlert size={18} />}
          label="禁止区域"
          defaultExpanded={true}
          groupToggle={true}
          groupEnabled={restrictedEnabled}
          onGroupToggle={setRestrictedEnabled}
          favoritable={true}
          isFavorite={restrictedFavorite}
          onFavoriteToggle={setRestrictedFavorite}
        >
          <button style={{ padding: '8px', margin: '4px 0', width: '100%' }}>
            レッドゾーン
          </button>
          <button style={{ padding: '8px', margin: '4px 0', width: '100%' }}>
            イエローゾーン
          </button>
        </ControlGroup>

        <ControlGroup
          id="aviation"
          icon={<Plane size={18} />}
          label="航空制限"
          defaultExpanded={false}
          groupToggle={true}
          groupEnabled={aviationEnabled}
          onGroupToggle={setAviationEnabled}
          favoritable={true}
          isFavorite={aviationFavorite}
          onFavoriteToggle={setAviationFavorite}
        >
          <button style={{ padding: '8px', margin: '4px 0', width: '100%' }}>
            空港エリア
          </button>
          <button style={{ padding: '8px', margin: '4px 0', width: '100%' }}>
            ヘリポート
          </button>
        </ControlGroup>
      </div>
    )
  },
}
