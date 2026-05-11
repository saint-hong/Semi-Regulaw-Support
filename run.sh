#!/bin/bash
set -euo pipefail

PORT=${PORT:-8000}

# 포트 점유 프로세스 정리
PIDS=$(lsof -t -i :"$PORT" 2>/dev/null || true)
if [ -n "$PIDS" ]; then
    echo "[run.sh] 포트 $PORT 점유 PID $PIDS 종료 중..."
    kill -SIGTERM $PIDS 2>/dev/null || true
    sleep 1
    REMAINING=$(lsof -t -i :"$PORT" 2>/dev/null || true)
    [ -n "$REMAINING" ] && kill -SIGKILL $REMAINING 2>/dev/null || true
    echo "[run.sh] 포트 $PORT 해제 완료"
fi

echo "[run.sh] 서버 시작 (포트 $PORT)..."
exec python -m src.main
