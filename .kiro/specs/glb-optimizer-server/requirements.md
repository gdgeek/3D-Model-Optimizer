# Requirements Document

## Introduction

本文档定义了 GLB 模型优化服务器的功能需求。该服务器是一个基于 Node.js 的本地部署服务，提供 RESTful API 用于优化 3D GLB 模型文件。所有依赖库均为免费开源，优化后的模型兼容 Unity 和 Web 端。

核心优化能力包括：
- 网格减面（meshoptimizer simplify）
- Draco 几何压缩（google/draco）
- 纹理压缩（KHR_texture_basisu / Basis Universal）
- 向量量化（gltf-transform quantize）
- 其他优化（合并 mesh、移除未使用资源）

技术栈：
- Node.js 服务器
- gltf-transform 作为核心 glTF 处理库 (MIT)
- meshoptimizer (MIT)
- google/draco (Apache 2.0)
- Basis Universal / KTX-Software (Apache 2.0)

## Glossary

- **GLB_Optimizer_Server**: 提供 GLB 模型优化服务的 HTTP 服务器
- **GLB_File**: glTF 2.0 二进制格式的 3D 模型文件
- **Mesh_Simplifier**: 使用 meshoptimizer simplify 进行网格减面处理的组件
- **Draco_Compressor**: 使用 google/draco 压缩几何数据的组件
- **Texture_Compressor**: 使用 KHR_texture_basisu (Basis Universal) 压缩纹理的组件
- **Vertex_Quantizer**: 使用 gltf-transform quantize 进行向量量化的组件
- **Mesh_Merger**: 合并相同材质 mesh 的组件
- **Resource_Cleaner**: 移除未使用节点和材质的组件
- **Optimization_Pipeline**: 协调各优化组件的处理流水线

## Requirements

### Requirement 1: 文件上传与下载

**User Story:** 作为开发者，我希望能够上传 GLB 文件并下载优化后的结果，以便集成到我的工作流程中。

#### Acceptance Criteria

1. WHEN 用户上传一个有效的 GLB 文件 THEN THE GLB_Optimizer_Server SHALL 接受该文件并返回任务标识符
2. WHEN 用户上传一个无效或损坏的文件 THEN THE GLB_Optimizer_Server SHALL 返回描述性错误信息
3. WHEN 用户上传超过大小限制的文件 THEN THE GLB_Optimizer_Server SHALL 拒绝该文件并返回大小限制错误
4. WHEN 优化任务完成 THEN THE GLB_Optimizer_Server SHALL 提供下载优化后 GLB 文件的端点
5. THE GLB_Optimizer_Server SHALL 支持最大 100MB 的 GLB 文件上传

### Requirement 2: 网格减面

**User Story:** 作为开发者，我希望能够减少模型的多边形数量，以便在保持视觉质量的同时降低渲染负担。

#### Acceptance Criteria

1. WHEN 用户请求网格减面并指定目标三角形数量 THEN THE Mesh_Simplifier SHALL 使用 meshoptimizer simplify 将网格减少到指定数量
2. WHEN 用户请求网格减面并指定目标比例 THEN THE Mesh_Simplifier SHALL 使用 meshoptimizer simplify 将网格面数减少到指定比例
3. WHEN 用户指定的目标比例超出有效范围(0-1) THEN THE Mesh_Simplifier SHALL 返回参数错误
4. THE Mesh_Simplifier SHALL 支持保留边界边选项
5. THE Mesh_Simplifier SHALL 支持误差阈值控制参数
6. WHEN 网格减面完成 THEN THE Mesh_Simplifier SHALL 返回原始三角形数和减面后三角形数的统计信息

### Requirement 3: Draco 几何压缩

**User Story:** 作为开发者，我希望能够使用 Draco 压缩模型的几何数据，以便大幅减小文件传输大小。

#### Acceptance Criteria

1. WHEN 用户请求 Draco 压缩 THEN THE Draco_Compressor SHALL 使用 google/draco 压缩几何数据
2. WHEN 用户指定压缩级别 THEN THE Draco_Compressor SHALL 按照指定级别进行压缩
3. THE Draco_Compressor SHALL 支持 0-10 的压缩级别，其中 10 为最高压缩率
4. THE Draco_Compressor SHALL 默认使用压缩级别 7
5. WHEN Draco 压缩完成 THEN THE Draco_Compressor SHALL 返回压缩前后的文件大小对比
6. IF 压缩过程中发生错误 THEN THE Draco_Compressor SHALL 返回详细的错误信息并保留原始数据

### Requirement 4: 纹理压缩

**User Story:** 作为开发者，我希望能够将纹理压缩为 KTX2/Basis Universal 格式，以便获得 Unity 和 Web 通用的 GPU 友好纹理。

#### Acceptance Criteria

1. WHEN 用户请求纹理压缩 THEN THE Texture_Compressor SHALL 使用 KHR_texture_basisu 将纹理转换为 Basis Universal 格式
2. THE Texture_Compressor SHALL 支持 ETC1S 编码模式
3. THE Texture_Compressor SHALL 支持 UASTC 编码模式
4. WHEN 用户未指定编码模式 THEN THE Texture_Compressor SHALL 默认使用 ETC1S 模式
5. THE Texture_Compressor SHALL 支持质量参数配置
6. WHEN 纹理压缩完成 THEN THE Texture_Compressor SHALL 返回每个纹理的压缩统计信息
7. WHEN 模型不包含纹理 THEN THE Texture_Compressor SHALL 跳过纹理压缩并返回相应提示

### Requirement 5: 向量量化

**User Story:** 作为开发者，我希望能够对顶点数据进行量化，以便减小文件大小同时保持足够精度。

#### Acceptance Criteria

1. WHEN 用户请求向量量化 THEN THE Vertex_Quantizer SHALL 使用 gltf-transform quantize 进行量化处理
2. THE Vertex_Quantizer SHALL 支持 Position（位置坐标）量化
3. THE Vertex_Quantizer SHALL 支持 Normal（法线）量化
4. THE Vertex_Quantizer SHALL 支持 UV/TexCoord（纹理坐标）量化
5. THE Vertex_Quantizer SHALL 支持 Tangent（切线）量化
6. WHEN 用户指定量化选项 THEN THE Vertex_Quantizer SHALL 仅对指定的属性进行量化
7. WHEN 向量量化完成 THEN THE Vertex_Quantizer SHALL 返回量化前后的数据大小对比

### Requirement 6: Mesh 合并

**User Story:** 作为开发者，我希望能够合并使用相同材质的 mesh，以便减少 draw call 提升渲染性能。

#### Acceptance Criteria

1. WHEN 用户请求 mesh 合并 THEN THE Mesh_Merger SHALL 合并使用相同材质的 mesh
2. WHEN mesh 合并完成 THEN THE Mesh_Merger SHALL 返回合并前后的 mesh 数量统计
3. IF 模型中没有可合并的 mesh THEN THE Mesh_Merger SHALL 返回相应提示信息

### Requirement 7: 资源清理

**User Story:** 作为开发者，我希望能够移除模型中未使用的资源，以便减小文件大小。

#### Acceptance Criteria

1. WHEN 用户请求资源清理 THEN THE Resource_Cleaner SHALL 移除未使用的节点
2. WHEN 用户请求资源清理 THEN THE Resource_Cleaner SHALL 移除未使用的材质
3. WHEN 资源清理完成 THEN THE Resource_Cleaner SHALL 返回移除的资源统计信息

### Requirement 8: 优化流水线

**User Story:** 作为开发者，我希望能够一次性执行多种优化操作，以便简化工作流程。

#### Acceptance Criteria

1. WHEN 用户请求组合优化 THEN THE Optimization_Pipeline SHALL 按顺序执行所选的优化步骤
2. THE Optimization_Pipeline SHALL 支持任意组合的优化选项（减面、Draco 压缩、纹理压缩、向量量化、mesh 合并、资源清理）
3. WHEN 流水线中某一步骤失败 THEN THE Optimization_Pipeline SHALL 停止执行并返回失败步骤的详细信息
4. WHEN 所有优化步骤完成 THEN THE Optimization_Pipeline SHALL 返回完整的优化报告
5. THE Optimization_Pipeline SHALL 按照合理的顺序执行优化：资源清理 → mesh 合并 → 网格减面 → 向量量化 → Draco 压缩 → 纹理压缩

### Requirement 9: API 接口

**User Story:** 作为开发者，我希望通过 RESTful API 访问所有功能，以便轻松集成到现有系统中。

#### Acceptance Criteria

1. THE GLB_Optimizer_Server SHALL 提供 RESTful API 端点用于所有优化操作
2. THE GLB_Optimizer_Server SHALL 返回 JSON 格式的响应
3. WHEN API 请求缺少必要参数 THEN THE GLB_Optimizer_Server SHALL 返回 400 状态码和错误详情
4. WHEN 请求的资源不存在 THEN THE GLB_Optimizer_Server SHALL 返回 404 状态码
5. WHEN 服务器内部错误发生 THEN THE GLB_Optimizer_Server SHALL 返回 500 状态码和错误信息
6. THE GLB_Optimizer_Server SHALL 在响应中包含处理时间信息

### Requirement 10: 本地部署与开源合规

**User Story:** 作为开发者，我希望服务器能够完全本地部署且所有依赖都是免费开源的，以便在无网络环境下使用且无许可证问题。

#### Acceptance Criteria

1. THE GLB_Optimizer_Server SHALL 支持完全本地部署，无需外部网络连接
2. THE GLB_Optimizer_Server SHALL 仅使用免费开源的依赖库
3. THE GLB_Optimizer_Server SHALL 使用 gltf-transform (MIT) 作为核心 glTF 处理库
4. THE GLB_Optimizer_Server SHALL 使用 meshoptimizer (MIT) 进行网格减面
5. THE GLB_Optimizer_Server SHALL 使用 google/draco (Apache 2.0) 进行几何压缩
6. THE GLB_Optimizer_Server SHALL 使用 Basis Universal / KTX-Software (Apache 2.0) 进行纹理压缩
