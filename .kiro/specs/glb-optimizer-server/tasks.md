# Implementation Plan: GLB Optimizer Server

## Overview

基于 Node.js + Express + TypeScript 实现 GLB 模型优化服务器。采用模块化架构，各优化组件独立封装，通过流水线协调执行。使用 Swagger 提供 API 文档。

## Tasks

- [x] 1. 项目初始化与基础架构
  - [x] 1.1 初始化 Node.js 项目并配置 TypeScript
    - 创建 package.json，配置 TypeScript 编译选项
    - 安装核心依赖: express, @gltf-transform/core, @gltf-transform/extensions, @gltf-transform/functions
    - 安装开发依赖: typescript, @types/express, vitest, fast-check
    - 配置 tsconfig.json
    - _Requirements: 10.1, 10.2_

  - [x] 1.2 创建项目目录结构
    - 创建 src/routes, src/components, src/models, src/utils 目录
    - 创建入口文件 src/index.ts
    - _Requirements: 10.1_

  - [x] 1.3 配置 Swagger/OpenAPI
    - 安装 swagger-ui-express, swagger-jsdoc
    - 创建 src/config/swagger.ts 配置文件
    - 设置 /api-docs 和 /api-docs.json 端点
    - _Requirements: 9.1, 9.2_

- [x] 2. 核心数据模型与接口定义
  - [x] 2.1 定义优化选项接口
    - 创建 src/models/options.ts
    - 定义 OptimizationOptions, SimplifyOptions, DracoOptions, TextureOptions, QuantizeOptions, CleanOptions 接口
    - _Requirements: 2.1-2.6, 3.1-3.4, 4.1-4.6, 5.1-5.7_

  - [x] 2.2 定义结果与统计接口
    - 创建 src/models/result.ts
    - 定义 OptimizationResult, OptimizationStepResult 及各组件统计接口
    - _Requirements: 2.6, 3.5, 4.6, 5.7, 6.2, 7.3, 8.4_

  - [x] 2.3 定义任务与错误模型
    - 创建 src/models/task.ts 和 src/models/error.ts
    - 定义 Task, TaskStatus, ErrorResponse, ERROR_CODES
    - _Requirements: 1.1, 9.3-9.5_

- [x] 3. 文件处理与验证
  - [x] 3.1 实现文件验证工具
    - 创建 src/utils/file-validator.ts
    - 实现 GLB 文件格式验证、大小检查
    - 定义 FILE_CONSTRAINTS 常量 (100MB 限制)
    - _Requirements: 1.2, 1.3, 1.5_

  - [ ]* 3.2 编写文件验证属性测试
    - **Property 2: Invalid File Rejection**
    - **Validates: Requirements 1.2**

  - [x] 3.3 实现文件存储管理
    - 创建 src/utils/storage.ts
    - 实现临时文件存储和结果文件管理
    - 实现文件清理机制
    - _Requirements: 1.1, 1.4_

- [x] 4. Checkpoint - 基础架构验证
  - 确保项目可以编译运行，Swagger UI 可访问
  - 确保所有测试通过，如有问题请询问用户

- [x] 5. 优化组件实现 - 资源清理
  - [x] 5.1 实现 Resource Cleaner 组件
    - 创建 src/components/resource-cleaner.ts
    - 使用 gltf-transform prune() 移除未使用资源
    - 返回清理统计信息
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 5.2 编写资源清理属性测试
    - **Property 14: Resource Cleanup Effectiveness**
    - **Validates: Requirements 7.1, 7.2**

- [x] 6. 优化组件实现 - Mesh 合并
  - [x] 6.1 实现 Mesh Merger 组件
    - 创建 src/components/mesh-merger.ts
    - 使用 gltf-transform join() 合并相同材质的 mesh
    - 返回合并统计信息
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 6.2 编写 Mesh 合并属性测试
    - **Property 12: Mesh Merge Material Preservation**
    - **Property 13: Mesh Merge Count Reduction**
    - **Validates: Requirements 6.1, 6.2**

- [x] 7. 优化组件实现 - 网格减面
  - [x] 7.1 实现 Mesh Simplifier 组件
    - 创建 src/components/mesh-simplifier.ts
    - 使用 @gltf-transform/functions simplify() 和 meshoptimizer
    - 支持目标比例、目标数量、误差阈值、边界保留
    - 返回减面统计信息
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 7.2 编写网格减面属性测试
    - **Property 4: Mesh Simplification Target Compliance**
    - **Property 5: Simplification Ratio Validation**
    - **Validates: Requirements 2.1, 2.2, 2.3**

- [x] 8. 优化组件实现 - 向量量化
  - [x] 8.1 实现 Vertex Quantizer 组件
    - 创建 src/components/vertex-quantizer.ts
    - 使用 gltf-transform quantize() 进行量化
    - 支持 Position, Normal, UV, Tangent 选择性量化
    - 返回量化统计信息
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 8.2 编写向量量化属性测试
    - **Property 10: Quantization Size Reduction**
    - **Property 11: Selective Quantization**
    - **Validates: Requirements 5.1, 5.6**

- [x] 9. Checkpoint - 核心组件验证
  - 确保所有已实现组件测试通过
  - 如有问题请询问用户

- [x] 10. 优化组件实现 - Draco 压缩
  - [x] 10.1 实现 Draco Compressor 组件
    - 创建 src/components/draco-compressor.ts
    - 使用 @gltf-transform/extensions KHR_draco_mesh_compression
    - 支持压缩级别 0-10，默认 7
    - 返回压缩统计信息
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 10.2 编写 Draco 压缩属性测试
    - **Property 6: Draco Compression Size Reduction**
    - **Property 7: Draco Compression Level Effect**
    - **Validates: Requirements 3.1, 3.2, 3.3**

- [x] 11. 优化组件实现 - 纹理压缩
  - [x] 11.1 实现 Texture Compressor 组件
    - 创建 src/components/texture-compressor.ts
    - 使用 gltf-transform textureCompress() 和 KHR_texture_basisu
    - 支持 ETC1S 和 UASTC 模式
    - 返回纹理压缩统计信息
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 11.2 编写纹理压缩属性测试
    - **Property 8: Texture Compression Output Format**
    - **Property 9: Texture Compression Statistics Completeness**
    - **Validates: Requirements 4.1, 4.6**

- [x] 12. 优化流水线实现
  - [x] 12.1 实现 Optimization Pipeline
    - 创建 src/components/optimization-pipeline.ts
    - 按顺序执行: clean → merge → simplify → quantize → draco → texture
    - 支持任意组合的优化选项
    - 实现失败隔离和错误报告
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 12.2 编写流水线属性测试
    - **Property 15: Pipeline Step Ordering**
    - **Property 16: Pipeline Combination Support**
    - **Property 17: Pipeline Failure Isolation**
    - **Property 18: Pipeline Report Completeness**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

- [x] 13. Checkpoint - 流水线验证
  - 确保流水线可以正确协调所有组件
  - 确保所有测试通过，如有问题请询问用户

- [x] 14. API 路由实现
  - [x] 14.1 实现文件上传端点
    - 创建 src/routes/optimize.ts
    - 实现 POST /api/optimize 端点
    - 集成 multer 处理文件上传
    - 添加 Swagger JSDoc 注释
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 9.1_

  - [x] 14.2 实现文件下载端点
    - 创建 src/routes/download.ts
    - 实现 GET /api/download/:taskId 端点
    - 添加 Swagger JSDoc 注释
    - _Requirements: 1.4, 9.1_

  - [x] 14.3 实现任务状态端点
    - 创建 src/routes/status.ts
    - 实现 GET /api/status/:taskId 端点
    - 添加 Swagger JSDoc 注释
    - _Requirements: 9.1_

  - [x] 14.4 实现错误处理中间件
    - 创建 src/middleware/error-handler.ts
    - 统一错误响应格式
    - 处理各类 HTTP 状态码
    - _Requirements: 9.3, 9.4, 9.5_

  - [ ]* 14.5 编写 API 属性测试
    - **Property 1: Valid File Upload Acceptance**
    - **Property 3: Optimization Output Validity**
    - **Property 19: API Response Format Consistency**
    - **Property 20: API Error Status Codes**
    - **Property 21: API Processing Time Inclusion**
    - **Validates: Requirements 1.1, 1.4, 9.2, 9.3, 9.4, 9.6**

- [x] 15. 服务器集成与启动
  - [x] 15.1 集成所有路由和中间件
    - 更新 src/index.ts
    - 配置 Express 应用
    - 集成 Swagger UI
    - 配置 CORS 和请求体解析
    - _Requirements: 9.1, 9.2, 10.1_

  - [x] 15.2 添加配置管理
    - 创建 src/config/index.ts
    - 支持环境变量配置
    - 配置文件大小限制、超时等参数
    - _Requirements: 1.5, 10.1_

- [x] 16. Final Checkpoint - 完整功能验证
  - 确保所有测试通过
  - 确保 Swagger UI 正确显示所有 API
  - 确保端到端流程正常工作
  - 如有问题请询问用户

## Notes

- 任务标记 `*` 为可选测试任务，可跳过以加快 MVP 开发
- 每个任务都引用了具体的需求条款以确保可追溯性
- Checkpoint 任务用于增量验证
- 属性测试验证通用正确性属性
- 单元测试验证具体示例和边界条件
