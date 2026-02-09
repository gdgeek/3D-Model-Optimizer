---
description: 本地运行、测试、调试项目时的 Docker Compose 规范
---

# 本地运行规范

本项目依赖多种系统级工具（KTX-Software/toktx、FBX2glTF、COLLADA2GLTF、Python USD/STEP 库等），这些工具仅在 Docker 镜像中预装。因此：

## 强制规则

- 本地运行、测试、调试本项目时，必须使用 `docker compose` 环境，禁止直接在宿主机上运行服务。
- 启动服务：`docker compose up --build`
- 后台启动：`docker compose up --build -d`
- 查看日志：`docker compose logs -f`
- 停止服务：`docker compose down`
- 进入容器调试：`docker compose exec glb-optimizer sh`
- 在容器内运行测试：`docker compose exec glb-optimizer npm test`

## 原因

- Dockerfile 中安装了 KTX-Software、FBX2glTF、COLLADA2GLTF、Python usd-core/cadquery 等依赖，宿主机通常不具备这些环境。
- `docker-compose.yml` 已配置端口映射（3000:3000）、资源目录挂载（./resource:/app/resource）和健康检查。
- 直接在宿主机运行 `npm start` 或 `node dist/index.js` 会因缺少系统依赖而失败。

## 注意事项

- 修改代码后需要重新构建：`docker compose up --build`
- 如需修改环境变量，在 `docker-compose.yml` 的 `environment` 部分配置，不要在宿主机设置。
