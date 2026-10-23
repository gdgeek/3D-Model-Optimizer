# 微信支付公钥模式

微信支付适配器位于独立子模块 `services/payment-service`，由 `7dgame-com/wechat-pay` 仓库构建支付镜像。优化器 API、dispatcher、monitor 镜像不包含这段支付实现。

部署公钥版本时，保留现有商户身份、商户 API 证书、私钥和 APIv3 密钥，配置：

- `WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH`：容器内已挂载的微信支付公钥 PEM 路径。
- `WECHAT_PAY_PLATFORM_SERIAL_NO`：该公钥对应的完整 `PUB_KEY_ID_...`，来自商户平台。
- `WECHAT_PAY_IMAGE_TAG`：经测试发布的支付镜像版本。Portainer 模板支持 `develop@sha256:<digest>`，可固定到通过验证的镜像。

`WECHAT_PAY_CERT_SERIAL_NO` 是商户 API 证书序列号，仍用于商户请求签名，不能改成微信支付公钥 ID。`WECHAT_PAY_API_V3_KEY` 用于回调资源解密，公钥迁移本身不需要重设它。

支付请求携带公钥 ID 和受支持的语言头。成功应答在解析 JSON 前验证原始正文签名；支付及发票回调按 `Wechatpay-Serial` 选择对应材料，先验签再解析和解密。未知序列号、缺少验签字段、无效签名及超出五分钟窗口的消息会被拒绝。若灰度期仍需旧平台证书，使用 `WECHAT_PAY_PLATFORM_CERT` 或 `WECHAT_PAY_PLATFORM_CERT_PATH` 显式提供旧证书，不能拿商户 API 证书代替。

部署后检查支付容器健康状态，使用只读微信接口验证默认请求头、应答验签和 APIv3 解密，并核对其他服务未被意外更新。真实支付与回调仍需在业务入口核对。商户平台最终确认应在所有使用该商户号的服务就绪后进行。

开发验证在子模块中使用 Node.js 22，执行 `npm ci`、`npm run build`、`npm test` 和 `npm run lint`。主仓库与子模块分别提交；主仓库记录通过测试的子模块提交。
