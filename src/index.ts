import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import https from 'https';

// 环境变量中的API密钥
const GAODE_API_KEY = process.env.GAODE_API_KEY;

// 通用HTTP请求函数
async function makeRequest(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// 创建地图可视化URL
function createMapVisualizationUrl(pois: any[]): string {
  if (!pois || pois.length === 0) {
    return "";
  }

  // 创建地图标记点参数
  const markers = pois.map((poi, index) => {
    const location = poi.location.split(',');
    return `markers=mid,0xFF0000,${String.fromCharCode(65 + index)}:${location[0]},${location[1]}`;
  }).join('&');

  // 创建路线参数
  let path = "path=";
  pois.forEach((poi) => {
    path += `${poi.location};`;
  });
  path = path.slice(0, -1); // 移除最后的分号

  // 计算地图中心点（取第一个POI的位置）
  const center = pois[0].location;

  // 创建静态地图URL
  return `https://restapi.amap.com/v3/staticmap?key=${GAODE_API_KEY}&zoom=12&size=750*500&scale=2&location=${center}&${markers}&${path}`;
}

// 创建路线规划HTML
function createRouteHtml(title: string, pois: any[], routeDetails: any[], weatherInfo?: any): string {
  let html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 20px; line-height: 1.6; }
      .container { max-width: 1000px; margin: 0 auto; }
      .header { background-color: #4CAF50; color: white; padding: 20px; margin-bottom: 20px; border-radius: 5px; }
      .map-container { margin-bottom: 30px; }
      .map-img { max-width: 100%; border-radius: 5px; border: 1px solid #ddd; }
      .poi-card { background-color: #f9f9f9; margin-bottom: 15px; padding: 15px; border-radius: 5px; border-left: 5px solid #4CAF50; }
      .poi-name { font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #333; }
      .poi-info { color: #666; }
      .route-step { background-color: #f0f7ff; margin-bottom: 10px; padding: 10px; border-radius: 5px; }
      .weather-info { background-color: #fff9e6; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
      .day-info { display: flex; justify-content: space-between; margin-bottom: 10px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>${title}</h1>
        <p>智能旅游路线规划</p>
      </div>`;

  // 添加天气信息（如果有）
  if (weatherInfo && weatherInfo.forecasts && weatherInfo.forecasts.length > 0) {
    html += `
      <div class="weather-info">
        <h2>旅行期间天气预报</h2>`;

    const casts = weatherInfo.forecasts[0].casts;
    casts.forEach((cast: any) => {
      html += `
        <div class="day-info">
          <span><strong>${cast.date}</strong>: ${cast.dayweather} → ${cast.nightweather}</span>
          <span>温度: ${cast.daytemp}°C ~ ${cast.nighttemp}°C</span>
        </div>`;
    });

    html += `
      </div>`;
  }

  // 添加地图可视化
  const mapUrl = createMapVisualizationUrl(pois);
  html += `
      <div class="map-container">
        <h2>路线地图</h2>
        <img class="map-img" src="${mapUrl}" alt="路线地图">
        <p>查看<a href="https://uri.amap.com/marker?markers=${pois.map(p => p.location + ',' + p.name).join('|')}" target="_blank">高德地图详细路线</a></p>
      </div>
      
      <h2>景点详情</h2>`;

  // 添加POI详情
  pois.forEach((poi, index) => {
    html += `
      <div class="poi-card">
        <div class="poi-name">${String.fromCharCode(65 + index)}. ${poi.name}</div>
        <div class="poi-info">
          <p><strong>地址:</strong> ${poi.address || '暂无'}</p>
          ${poi.tel ? `<p><strong>电话:</strong> ${poi.tel}</p>` : ''}
          ${poi.rating ? `<p><strong>评分:</strong> ${poi.rating}</p>` : ''}
          ${poi.type ? `<p><strong>类型:</strong> ${poi.type}</p>` : ''}
          ${poi.business_area ? `<p><strong>商圈:</strong> ${poi.business_area}</p>` : ''}
        </div>
      </div>`;
  });

  // 添加路线详情
  if (routeDetails && routeDetails.length > 0) {
    html += `
      <h2>路线详情</h2>`;

    routeDetails.forEach((route, index) => {
      if (index < pois.length - 1) {
        html += `
      <div class="poi-card">
        <div class="poi-name">从 ${pois[index].name} 到 ${pois[index + 1].name}</div>
        <div class="poi-info">
          <p><strong>距离:</strong> ${route.distance}米 (约${(route.distance / 1000).toFixed(1)}公里)</p>
          <p><strong>预计用时:</strong> ${Math.floor(route.duration / 60)}分钟</p>
        </div>`;

        if (route.steps && route.steps.length > 0) {
          html += `
        <div class="route-steps">
          <p><strong>详细路线:</strong></p>`;

          route.steps.forEach((step: any) => {
            html += `
          <div class="route-step">${step.instruction}</div>`;
          });

          html += `
        </div>`;
        }

        html += `
      </div>`;
      }
    });
  }

  html += `
    </div>
  </body>
  </html>`;

  return html;
}

// 创建MCP服务器
const server = new McpServer({
  name: "gaode-maps",
  version: "1.0.0"
});

// 实现地点搜索
server.tool("searchPOI",
  {
    keywords: z.string().describe("要搜索的关键词"),
    city: z.string().optional().describe("搜索的城市名称"),
    types: z.string().optional().describe("POI类型"),
    page: z.number().optional().describe("页码，默认为1"),
    offset: z.number().optional().describe("每页记录数，默认为20"),
    extensions: z.enum(["base", "all"]).optional().describe("返回结果控制，base返回基本信息，all返回详细信息")
  },
  async (params) => {
    if (!GAODE_API_KEY) {
      throw new Error("高德地图API密钥未设置");
    }

    const { keywords, city, types, page = 1, offset = 20, extensions = "all" } = params;

    let url = `https://restapi.amap.com/v3/place/text?key=${GAODE_API_KEY}&keywords=${encodeURIComponent(keywords)}&offset=${offset}&page=${page}&extensions=${extensions}&output=json`;

    if (city) {
      url += `&city=${encodeURIComponent(city)}`;
    }

    if (types) {
      url += `&types=${encodeURIComponent(types)}`;
    }

    const result = await makeRequest(url);

    const pois = result.pois.map((poi: any) => ({
      id: poi.id,
      name: poi.name,
      type: poi.type,
      address: poi.address || '',
      location: poi.location,
      tel: poi.tel,
      distance: poi.distance,
      rating: poi.biz_ext?.rating,
      business_area: poi.business_area,
      photos: poi.photos
    }));

    const mapUrl = createMapVisualizationUrl(pois);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          status: result.status,
          count: parseInt(result.count, 10),
          pois,
          mapUrl
        })
      }]
    };
  }
);

// 实现地理编码
server.tool("geocode",
  {
    address: z.string().describe("要转换的地址"),
    city: z.string().optional().describe("地址所在城市")
  },
  async (params) => {
    if (!GAODE_API_KEY) {
      throw new Error("高德地图API密钥未设置");
    }

    const { address, city } = params;

    let url = `https://restapi.amap.com/v3/geocode/geo?key=${GAODE_API_KEY}&address=${encodeURIComponent(address)}&output=json`;

    if (city) {
      url += `&city=${encodeURIComponent(city)}`;
    }

    const result = await makeRequest(url);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          status: result.status,
          count: parseInt(result.count, 10),
          geocodes: result.geocodes
        })
      }]
    };
  }
);

// 实现逆地理编码
server.tool("regeocode",
  {
    location: z.string().describe("经纬度坐标，格式为：116.481499,39.990475"),
    extensions: z.enum(["base", "all"]).optional().describe("返回结果控制")
  },
  async (params) => {
    if (!GAODE_API_KEY) {
      throw new Error("高德地图API密钥未设置");
    }

    const { location, extensions = "all" } = params;

    const url = `https://restapi.amap.com/v3/geocode/regeo?key=${GAODE_API_KEY}&location=${encodeURIComponent(location)}&extensions=${extensions}&output=json`;

    const result = await makeRequest(url);

    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// 实现路线规划
server.tool("getRoute",
  {
    origin: z.string().describe("起点坐标，格式为：116.481499,39.990475"),
    destination: z.string().describe("终点坐标，格式为：116.481499,39.990475"),
    type: z.enum(["driving", "walking", "transit"]).describe("路线类型：driving(驾车)、walking(步行)、transit(公交)"),
    strategy: z.number().optional().describe("导航策略：0-速度优先(默认)，1-费用优先，2-距离优先，3-不走高速，4-躲避拥堵，5-多策略（同时使用速度与费用优先策略）")
  },
  async (params) => {
    if (!GAODE_API_KEY) {
      throw new Error("高德地图API密钥未设置");
    }

    const { origin, destination, type, strategy = 0 } = params;

    let url;
    if (type === "driving") {
      url = `https://restapi.amap.com/v3/direction/driving?key=${GAODE_API_KEY}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&strategy=${strategy}&output=json`;
    } else if (type === "walking") {
      url = `https://restapi.amap.com/v3/direction/walking?key=${GAODE_API_KEY}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&output=json`;
    } else {
      url = `https://restapi.amap.com/v3/direction/transit/integrated?key=${GAODE_API_KEY}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&output=json`;
    }

    const result = await makeRequest(url);

    // 创建可视化地图URL
    const mapUrl = `https://uri.amap.com/marker?markers=${origin},起点|${destination},终点&callnative=0`;

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          ...result,
          mapUrl
        })
      }]
    };
  }
);

// 实现天气查询
server.tool("getWeather",
  {
    city: z.string().describe("城市编码"),
    extensions: z.enum(["base", "all"]).optional().describe("气象类型：base(实况天气)、all(预报天气)")
  },
  async (params) => {
    if (!GAODE_API_KEY) {
      throw new Error("高德地图API密钥未设置");
    }

    const { city, extensions = "all" } = params;

    const url = `https://restapi.amap.com/v3/weather/weatherInfo?key=${GAODE_API_KEY}&city=${encodeURIComponent(city)}&extensions=${extensions}&output=json`;

    const result = await makeRequest(url);

    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// 实现景点详情查询
server.tool("getPOIDetail",
  {
    id: z.string().describe("景点ID")
  },
  async (params) => {
    if (!GAODE_API_KEY) {
      throw new Error("高德地图API密钥未设置");
    }

    const { id } = params;

    const url = `https://restapi.amap.com/v3/place/detail?key=${GAODE_API_KEY}&id=${id}&output=json`;

    const result = await makeRequest(url);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          status: result.status,
          poi: result.pois && result.pois.length > 0 ? result.pois[0] : null
        })
      }]
    };
  }
);

// 实现周边搜索
server.tool("searchAround",
  {
    location: z.string().describe("中心点坐标，格式为：116.481499,39.990475"),
    keywords: z.string().describe("要搜索的关键词"),
    types: z.string().optional().describe("POI类型，例如：餐饮、酒店、停车场"),
    radius: z.number().optional().describe("搜索半径，单位：米，默认1000"),
    offset: z.number().optional().describe("每页记录数，默认为20")
  },
  async (params) => {
    if (!GAODE_API_KEY) {
      throw new Error("高德地图API密钥未设置");
    }

    const { location, keywords, types, radius = 1000, offset = 20 } = params;

    let url = `https://restapi.amap.com/v3/place/around?key=${GAODE_API_KEY}&location=${encodeURIComponent(location)}&keywords=${encodeURIComponent(keywords)}&radius=${radius}&offset=${offset}&extensions=all&output=json`;

    if (types) {
      url += `&types=${encodeURIComponent(types)}`;
    }

    const result = await makeRequest(url);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          status: result.status,
          count: parseInt(result.count, 10),
          pois: result.pois.map((poi: any) => ({
            id: poi.id,
            name: poi.name,
            type: poi.type,
            address: poi.address || '',
            location: poi.location,
            tel: poi.tel,
            distance: poi.distance,
            rating: poi.biz_ext?.rating
          }))
        })
      }]
    };
  }
);

// 实现智能旅游路线规划
server.tool("planTourRoute",
  {
    city: z.string().describe("城市名称"),
    pois: z.array(z.string()).describe("景点名称列表"),
    days: z.number().optional().describe("旅游天数，默认为1"),
    transportation: z.enum(["driving", "walking", "transit"]).optional().describe("交通方式，默认driving"),
    returnHtml: z.boolean().optional().describe("是否返回HTML页面，默认true")
  },
  async (params) => {
    if (!GAODE_API_KEY) {
      throw new Error("高德地图API密钥未设置");
    }

    const { city, pois: poiNames, days = 1, transportation = "driving", returnHtml = true } = params;

    const title = `${city}${days}日游`;
    const poiResults = [];
    const routeResults = [];

    // 查询每个景点的信息
    for (const poiName of poiNames) {
      // 直接调用API而不是通过server对象
      let url = `https://restapi.amap.com/v3/place/text?key=${GAODE_API_KEY}&keywords=${encodeURIComponent(poiName)}&city=${encodeURIComponent(city)}&offset=1&page=1&extensions=all&output=json`;
      const searchResult = await makeRequest(url);

      if (searchResult.pois && searchResult.pois.length > 0) {
        poiResults.push({
          id: searchResult.pois[0].id,
          name: searchResult.pois[0].name,
          type: searchResult.pois[0].type,
          address: searchResult.pois[0].address || '',
          location: searchResult.pois[0].location,
          tel: searchResult.pois[0].tel,
          distance: searchResult.pois[0].distance,
          rating: searchResult.pois[0].biz_ext?.rating,
          business_area: searchResult.pois[0].business_area
        });
      }
    }

    // 规划景点之间的路线
    for (let i = 0; i < poiResults.length - 1; i++) {
      const origin = poiResults[i].location;
      const destination = poiResults[i + 1].location;

      // 直接调用API而不是通过server对象
      let routeUrl;
      if (transportation === "driving") {
        routeUrl = `https://restapi.amap.com/v3/direction/driving?key=${GAODE_API_KEY}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&strategy=0&output=json`;
      } else if (transportation === "walking") {
        routeUrl = `https://restapi.amap.com/v3/direction/walking?key=${GAODE_API_KEY}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&output=json`;
      } else {
        routeUrl = `https://restapi.amap.com/v3/direction/transit/integrated?key=${GAODE_API_KEY}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&output=json`;
      }

      const routeResult = await makeRequest(routeUrl);
      if (routeResult.route && routeResult.route.paths && routeResult.route.paths.length > 0) {
        const path = routeResult.route.paths[0];
        routeResults.push({
          distance: path.distance,
          duration: path.duration,
          steps: path.steps
        });
      }
    }

    // 获取城市天气信息
    let weatherInfo;
    try {
      // 查询城市编码
      let cityCodeUrl = `https://restapi.amap.com/v3/place/text?key=${GAODE_API_KEY}&keywords=${encodeURIComponent(city)}&types=110000&offset=1&output=json`;
      const cityCodeSearch = await makeRequest(cityCodeUrl);

      if (cityCodeSearch.pois && cityCodeSearch.pois.length > 0) {
        const adcode = cityCodeSearch.pois[0].adcode || cityCodeSearch.pois[0].citycode;
        if (adcode) {
          let weatherUrl = `https://restapi.amap.com/v3/weather/weatherInfo?key=${GAODE_API_KEY}&city=${encodeURIComponent(adcode)}&extensions=all&output=json`;
          weatherInfo = await makeRequest(weatherUrl);
        }
      }
    } catch (e) {
      console.error("获取天气信息失败", e);
    }

    // 创建可视化地图URL
    const mapUrl = createMapVisualizationUrl(poiResults);

    // 创建HTML页面
    let htmlPage;
    if (returnHtml) {
      htmlPage = createRouteHtml(title, poiResults, routeResults, weatherInfo);
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          status: "1",
          title,
          days,
          pois: poiResults,
          routes: routeResults,
          mapUrl,
          htmlPage
        })
      }]
    };
  }
);

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.log("高德地图MCP服务已启动");

  // 保持运行
  await new Promise(() => { });
}

main().catch(console.error);