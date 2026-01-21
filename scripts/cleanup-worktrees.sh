#!/bin/bash
# git worktree クリーンアップスクリプト
# マージ済みのworktreeを一括削除

set -e

PARENT_DIR="/Users/ai/client/KSD/map-worktrees"
MAIN_REPO="/Users/ai/client/KSD/map-auto-waypoint"

echo "=== git worktree クリーンアップ ==="
echo ""

cd "$MAIN_REPO"

# 現在のworktree一覧を表示
echo "現在のWorktree一覧:"
git worktree list
echo ""

# 引数チェック
if [ "$1" == "--all" ]; then
    echo "すべてのworktreeを削除します..."
    for dir in "$PARENT_DIR"/issue-*; do
        if [ -d "$dir" ]; then
            issue_num=$(basename "$dir" | sed 's/issue-//')
            echo "  削除中: $dir"
            git worktree remove "$dir" --force 2>/dev/null || true
        fi
    done
    echo ""
    echo "完了: すべてのworktreeを削除しました"
elif [ -n "$1" ]; then
    # 特定のissue番号を指定
    worktree_path="$PARENT_DIR/issue-$1"
    if [ -d "$worktree_path" ]; then
        echo "Issue #$1 のworktreeを削除します..."
        git worktree remove "$worktree_path"
        echo "完了: $worktree_path を削除しました"
    else
        echo "エラー: $worktree_path が見つかりません"
        exit 1
    fi
else
    echo "使用方法:"
    echo "  $0 <issue番号>  - 特定のissueのworktreeを削除"
    echo "  $0 --all        - すべてのworktreeを削除"
    echo ""
    echo "例:"
    echo "  $0 23           - Issue #23のworktreeを削除"
    echo "  $0 --all        - 全worktreeを削除"
fi

echo ""
echo "現在のWorktree一覧:"
git worktree list
