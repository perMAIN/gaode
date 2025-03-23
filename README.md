# 高德地图 MCP 服务

这是一个基于 Model Context Protocol (MCP) 的高德地图服务集成项目，允许 AI 模型（如 Claude、GPT等）直接调用高德地图的各种功能，包括地点搜索、路线规划、地理编码等。

## 功能特点

- **地点搜索** - 根据关键词查找地点，支持城市范围限制
- **地理编码/逆地理编码** - 地址与坐标互相转换
- **路线规划** - 支持驾车、步行、公交等多种出行方式
- **周边搜索** - 查找指定坐标附近的POI
- **天气查询** - 获取城市天气信息
- **智能旅游规划** - 自动生成最优旅游路线并提供详细HTML页面

## 安装与配置

### 前提条件

- Node.js 16.x 或更高版本
- 高德地图开发者API密钥（可在[高德开放平台](https://lbs.amap.com/)申请）

### 安装步骤

1. 克隆项目代码
   ```bash
   git clone https://github.com/yourusername/gaode-mcp.git
   cd gaode-mcp
   ```

2. 安装依赖
   ```bash
   npm install
   ```

3. 配置API密钥
   - 创建一个`.env`文件在项目根目录
   - 添加以下内容：
     ```
     GAODE_API_KEY=你的高德地图API密钥
     ```

## 使用方法

### 启动服务

```bash
npm start
```

启动后，服务将通过标准输入/输出与MCP客户端通信。

### MCP工具说明

本服务提供以下MCP工具供AI模型调用：

#### 1. searchPOI - 地点搜索

```json
{
  "name": "searchPOI",
  "arguments": {
    "keywords": "故宫",
    "city": "北京",
    "types": "旅游景点",
    "page": 1,
    "offset": 20
  }
}
```

#### 2. geocode - 地理编码

```json
{
  "name": "geocode",
  "arguments": {
    "address": "北京市朝阳区阜通东大街6号",
    "city": "北京"
  }
}
```

#### 3. regeocode - 逆地理编码

```json
{
  "name": "regeocode",
  "arguments": {
    "location": "116.481499,39.990475",
    "extensions": "all"
  }
}
```

#### 4. getRoute - 路线规划

```json
{
  "name": "getRoute",
  "arguments": {
    "origin": "116.481499,39.990475",
    "destination": "116.465063,39.999538",
    "type": "driving",
    "strategy": 0
  }
}
```

#### 5. getWeather - 天气查询

```json
{
  "name": "getWeather",
  "arguments": {
    "city": "110000",
    "extensions": "all"
  }
}
```

#### 6. getPOIDetail - 地点详情

```json
{
  "name": "getPOIDetail",
  "arguments": {
    "id": "B000A8UIN8"
  }
}
```

#### 7. searchAround - 周边搜索

```json
{
  "name": "searchAround",
  "arguments": {
    "location": "116.481499,39.990475",
    "keywords": "餐厅",
    "types": "餐饮",
    "radius": 1000,
    "offset": 20
  }
}
```

#### 8. planTourRoute - 智能旅游路线规划

```json
{
  "name": "planTourRoute",
  "arguments": {
    "city": "北京",
    "pois": ["故宫", "长城", "颐和园", "天坛", "鸟巢"],
    "days": 3,
    "transportation": "driving",
    "returnHtml": true
  }
}
```

### 样例页面

项目包含一个示例页面 `beijing_tour.html`，展示了基于高德地图服务生成的北京三日游路线规划。可以通过浏览器直接打开此文件查看效果。

## 与AI助手集成

可以将此服务配置为AI助手（如Claude、GPT等）的Tool或Plugin，使其能够直接调用高德地图服务。

### 配置为Claude MCP Tool

1. 在[Claude MCP控制台](https://console.anthropic.com/mcp)中创建新的Tool
2. 配置启动命令：`npm start`
3. 保存并获取MCP配置链接
4. 与Claude聊天时，使用MCP配置链接启用高德地图工具

## 扩展开发

### 添加新功能

1. 在`src/index.ts`中添加新的工具定义：

```typescript
server.tool("yourNewTool",
  {
    param1: z.string().describe("参数1说明"),
    param2: z.number().describe("参数2说明")
  },
  async (params) => {
    // 实现你的功能...
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);
```

2. 重新启动服务即可使用新工具

## 许可证

MIT License

## 联系方式

如有问题或建议，请提交Issue或Pull Request。

---

**注意**：请勿在公开环境中暴露你的API密钥。
