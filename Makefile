.PHONY: start stop restart

PORT ?= 8000

start:
	@PORT=$(PORT) bash run.sh

stop:
	@-lsof -t -i :$(PORT) | xargs -r kill -SIGTERM 2>/dev/null || true
	@echo "[make] 포트 $(PORT) 서버 종료"

restart: stop start
