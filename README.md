# 3D Model Optimizer / 三维模型优化服务

高性能 3D 模型优化服务，支持多种格式转换、几何修复和压缩优化。

[![CI](https://github.com/gdgeek/3D-Model-Optimizer/actions/workflows/ci.yml/badge.svg)](https://github.com/gdgeek/3D-Model-Optimizer/actions/workflows/ci.yml)
[![Docker](https://github.com/gdgeek/3D-Model-Optimizer/actions/workflows/docker.yml/badge.svg)](https://github.com/gdgeek/3D-Model-Optimizer/actions/workflows/docker.yml)

## ✨ 功能特性

- **多格式转换**: GLB / GLTF / OBJ / STL / DAE / FBX / USDZ / STEP / PRT / CATIA / ASM → GLB
- **几何修复**: 自动修复 NaN 顶点、无效法线、损坏切线，确保跨设备兼容
- **Draco 压缩**: 几何数据压缩，减少 5-10 倍体积
- **纹理压缩**: KTX2 (ETC1S/UASTC) 纹理压缩
- **网格优化**: 减面、合并、量化、资源清理
- **优化预设**: 快速 / 均衡 / 极限 三档一键配置
- **实时进度**: SSE 推送优化管线逐步进度
- **安全加固**: Helmet.js 安全头 + API Key 认证
- **结构化日志**: Pino JSON 格式日志
- **Web UI**: Bootstrap 5 可视化界面，Three.js 双视图实时对比
- **REST API**: Swagger 文档，完整 OpenAPI 规范

## 🚀 快速开始

### Docker 部署（推荐）

```bash
docker compose up -d
```

- Web UI: http://localhost:3000
- API 文档: http://localhost:3000/api-docs

### 本地开发

```bash
npm install
npm run dev
```

> 本地环境仅支持 GLB/GLTF/OBJ/STL 格式，其他格式需要 Docker 环境中的外部工具。

## 📦 支持格式

| 格式 | 本地 | Docker | 转换工具 |
|------|:----:|:------:|----------|
| GLB / GLTF | ✅ | ✅ | gltf-transform |
| OBJ | ✅ | ✅ | obj2gltf |
| STL | ✅ | ✅ | 内置解析器 |
| DAE | ❌ | ✅ | COLLADA2GLTF |
| FBX | ❌ | ✅ | FBX2glTF |
| USDZ | ❌ | ✅ | usd-core (Python) |
| STEP / STP | ❌ | ✅ | trimesh + cadquery |
| PRT (Creo) | ❌ | ✅ | trimesh + OCP |
| CATPart / CATProduct | ❌ | ✅ | trimesh + OCP |
| ASM (Creo 装配体) | ❌ | ✅ | trimesh + OCP |

## 🔧 API

### 分析模型

```bash
curl -X POST http://localhost:3000/api/analyze -F "file=@model.glb"
```

### 优化模型（自定义选项）

```bash
curl -X POST http://localhost:3000/api/optimize \
  -F "file=@model.glb" \
  -F 'options={"clean":{"enabled":true},"draco":{"enabled":true,"compressionLevel":7}}'
```

### 优化模型（使用预设）

```bash
curl -X POST http://localhost:3000/api/optimize \
  -F "file=@model.glb" \
  -F "preset=balanced"
```

可选预设: `fast`（快速）、`balanced`（均衡）、`maximum`（极限）

### SSE 实时进度优化

```bash
curl -X POST http://localhost:3000/api/optimize/stream \
  -F "file=@model.glb" \
  -F "preset=balanced"
```

返回 Server-Sent Events 流，逐步推送每个优化步骤的状态。

### 下载结果

```bash
curl -O http://localhost:3000/api/download/{taskId}
```

### 查询状态

```bash
curl http://localhost:3000/api/status/{taskId}
```

## ⚙️ 优化流程

```
repair-input → clean → merge → simplify → quantize → draco → texture → repair-output
```

| 步骤 | 说明 | 默认 |
|------|------|:----:|
| repair-input | 修复 NaN 顶点、无效法线、损坏切线 | 始终执行 |
| clean | 移除未使用的节点、材质、纹理 | 可选 |
| merge | 合并相同材质的网格 | 可选 |
| simplify | 网格减面（可配置比例） | 可选 |
| quantize | 顶点属性量化 | 可选 |
| draco | Draco 几何压缩 | 可选 |
| texture | KTX2 纹理压缩 (ETC1S/UASTC) | 可选 |
| repair-output | 最终法线/切线验证与修复 | 始终执行 |

### 优化预设

| 预设 | 说明 | 包含步骤 |
|------|------|----------|
| `fast` | 快速模式 | clean + draco (level 3) |
| `balanced` | 均衡模式 | clean + merge + simplify (75%) + draco (level 7) + texture (ETC1S) |
| `maximum` | 极限模式 | clean + merge + simplify (50%) + draco (level 10) + texture (ETC1S) |

### 自定义选项示例

```json
{
  "clean": { "enabled": true },
  "merge": { "enabled": true },
  "simplify": { "enabled": true, "targetRatio": 0.5, "lockBorder": false },
  "draco": { "enabled": true, "compressionLevel": 7 },
  "texture": { "enabled": true, "mode": "ETC1S" }
}
```

## 🛡️ 安全与性能

- **Helmet.js**: 自动设置安全 HTTP 头（X-Content-Type-Options, X-Frame-Options 等）
- **API Key 认证**: 可选 API Key 保护所有接口
- **请求超时**: 5 分钟上限，防止长时间占用
- **Gzip 压缩**: 响应体自动压缩
- **Draco 单例**: 编解码器复用，避免重复 WASM 初始化
- **临时文件清理**: 1 小时过期自动清理，10 分钟轮询
- **参数校验**: 非法值自动钳位修正
- **结构化日志**: Pino JSON 格式，便于日志采集和分析

## 🛠️ 技术栈

- **运行时**: Node.js 20 / TypeScript
- **框架**: Express.js
- **3D 引擎**: @gltf-transform/core + extensions
- **压缩**: Draco3D, KTX-Software (toktx)
- **格式转换**: obj2gltf, FBX2glTF, COLLADA2GLTF, usd-core, trimesh, cadquery/OCP
- **安全**: Helmet.js, CORS
- **日志**: Pino (JSON structured logging)
- **前端**: Bootstrap 5.3, Three.js 0.160, Bootstrap Icons
- **容器**: Docker (linux/amd64)

## 📁 项目结构

```
src/
├── components/          # 优化组件
│   ├── optimization-pipeline.ts   # 流水线调度（支持 SSE 进度回调）
│   ├── geometry-fixer.ts          # 几何修复（输入/输出双阶段）
│   ├── format-converter.ts        # 多格式转 GLB（12 种格式）
│   ├── draco-singleton.ts         # Draco 编解码器单例
│   ├── resource-cleaner.ts        # 资源清理
│   ├── mesh-merger.ts             # 网格合并
│   ├── mesh-simplifier.ts         # 网格减面
│   ├── vertex-quantizer.ts        # 顶点量化
│   ├── draco-compressor.ts        # Draco 压缩
│   └── texture-compressor.ts      # 纹理压缩
├── routes/              # API 路由 (analyze, optimize, progress, download, status)
├── middleware/           # 错误处理、API Key 认证
├── models/              # 数据模型 (options + presets, result, task, error)
├── utils/               # 文件校验、存储管理、参数校验、结构化日志
└── config/              # Swagger 配置
public/                  # Web UI (Bootstrap + Three.js)
scripts/                 # Python 转换脚本 (usdz_to_glb.py)
tests/                   # 单元测试 (226 tests)
```

## 🧪 测试

```bash
npm test
```

## 📄 License

MIT

---

> **🤖 AI 友好说明** — 3D 模型压缩优化一站式方案：12 种格式转 GLB（含 CAD 格式 PRT/CATIA/ASM），集成几何修复 + Draco 压缩 + 纹理压缩 + 网格减面全链路优化。三档预设一键优化，SSE 实时进度推送。REST API / Docker 一键部署，Swagger 自描述文档，适合 Agent 自动化集成。
