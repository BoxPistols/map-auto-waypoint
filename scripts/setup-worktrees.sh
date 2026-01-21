#!/bin/bash
# git worktree セットアップスクリプト
# High優先度のissueから並行開発環境を構築

set -e

# 設定
PARENT_DIR="/Users/ai/client/KSD/map-worktrees"
MAIN_REPO="/Users/ai/client/KSD/map-auto-waypoint"
BASE_BRANCH="main"

# 作成するworktree一覧（issue番号: ブランチ名: ポート番号）
declare -a WORKTREES=(
    "23:feature/issue-23-path-collision-ui:3001"
    "25:feature/issue-25-restriction-surfaces:3002"
    "29:feature/issue-29-nofly-zones-expansion:3003"
    "20:feature/issue-20-collision-service-refactor:3004"
    "24:feature/issue-24-polygon-overlap-viz:3005"
)

echo "=== git worktree セットアップ ==="
echo ""

# 親ディレクトリ作成
if [ ! -d "$PARENT_DIR" ]; then
    echo "親ディレクトリを作成: $PARENT_DIR"
    mkdir -p "$PARENT_DIR"
fi

cd "$MAIN_REPO"

# mainブランチを最新に更新
echo "mainブランチを最新に更新中..."
git fetch origin
git checkout main
git pull origin main

echo ""
echo "=== Worktree作成開始 ==="

for item in "${WORKTREES[@]}"; do
    IFS=':' read -r issue_num branch_name port <<< "$item"
    worktree_path="$PARENT_DIR/issue-$issue_num"

    echo ""
    echo "--- Issue #$issue_num ---"

    # 既存のworktreeをチェック
    if [ -d "$worktree_path" ]; then
        echo "  既に存在: $worktree_path (スキップ)"
        continue
    fi

    # ブランチが存在するかチェック
    if git show-ref --verify --quiet "refs/heads/$branch_name"; then
        echo "  ブランチ存在: $branch_name"
        git worktree add "$worktree_path" "$branch_name"
    else
        echo "  新規ブランチ作成: $branch_name"
        git worktree add -b "$branch_name" "$worktree_path" "$BASE_BRANCH"
    fi

    echo "  Worktree作成完了: $worktree_path"
    echo "  開発サーバーポート: $port"
done

echo ""
echo "=== セットアップ完了 ==="
echo ""
echo "各worktreeでnpm installを実行してください:"
echo ""

for item in "${WORKTREES[@]}"; do
    IFS=':' read -r issue_num branch_name port <<< "$item"
    worktree_path="$PARENT_DIR/issue-$issue_num"
    if [ -d "$worktree_path" ]; then
        echo "  cd $worktree_path && npm install"
    fi
done

echo ""
echo "開発サーバー起動コマンド:"
echo ""

for item in "${WORKTREES[@]}"; do
    IFS=':' read -r issue_num branch_name port <<< "$item"
    worktree_path="$PARENT_DIR/issue-$issue_num"
    if [ -d "$worktree_path" ]; then
        echo "  Issue #$issue_num: cd $worktree_path && npm run dev -- --port $port"
    fi
done

echo ""
echo "Worktree一覧確認: git worktree list"
