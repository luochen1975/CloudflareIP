//推荐使用Pages上传部署（如需wokers部署或反复部署就删除默认节点代码），无需自定义域名而且稳定
//默认UUID：04c808e2-0b59-47b0-a54b-32fc7ef1c902 建议部署时修改
//默认反代IP：proxyip.cmliussss.net 无特殊要求无须修改
//部署后用手搓CF节点生成器(https://sub.cndyw.ggff.net/)生成节点导入到v2ray或karing中使用
//默认节点显示路径：https://部署域名/sub

import { connect } from 'cloudflare:sockets';

let 我的VL密钥 = 'bc757d2a-a816-4b41-bd92-a321357d6b66';//UUID
let 反代IP = 'proxyip.cmliussss.net'; //反代IP

export default {
  async fetch(访问请求, env) {
    try {
      return await 处理HTTP请求(访问请求, env);
    } catch (e) {
      // 诊断模式：把异常直接显示在页面上，定位问题后可改回 1101 默认行为
      return new Response(`Worker 内部错误: ${e.message}\n\n堆栈:\n${e.stack}`, {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  }
};

async function 处理HTTP请求(访问请求, env) {
    if (访问请求.headers.get('Upgrade') === 'websocket') {
      const 读取路径 = decodeURIComponent(访问请求.url.replace(/^https?:\/\/[^/]+/, ''));
      反代IP = 读取路径.match(/ip=([^&]+)/)?.[1] || 反代IP;
      const [客户端, WS接口] = Object.values(new WebSocketPair());
      WS接口.accept();
      启动传输管道(WS接口);
      return new Response(null, { status: 101, webSocket: 客户端 });
    } else {
        const 请求URL = new URL(访问请求.url);
        const 部署域名 = 请求URL.hostname;
        const 请求路径 = 请求URL.pathname;

        // 定义节点信息显示路径
        const 节点路径 = '/sub';

        if (请求路径 === 节点路径) {
            return new Response(`部署成功！

   你的UUID: ${我的VL密钥}
   你的部署域名：${部署域名}
   你的反代ip：${反代IP}

默认节点：
vless://${我的VL密钥}@${部署域名}:443?encryption=none&security=tls&sni=${部署域名}&fp=random&type=ws&host=${部署域名}&path=pyip%3D${反代IP}#${部署域名}
vless://${我的VL密钥}@108.162.192.0:443?encryption=none&security=tls&sni=${部署域名}&fp=random&type=ws&host=${部署域名}&path=pyip%3D${反代IP}#sg 新加坡 SG
vless://${我的VL密钥}@108.162.198.0:443?encryption=none&security=tls&sni=${部署域名}&fp=random&type=ws&host=${部署域名}&path=pyip%3D${反代IP}#jp 日本 JP
vless://${我的VL密钥}@104.18.0.0:443?encryption=none&security=tls&sni=${部署域名}&fp=random&type=ws&host=${部署域名}&path=pyip%3D${反代IP}#us 美国 US
vless://${我的VL密钥}@104.26.0.0:443?encryption=none&security=tls&sni=${部署域名}&fp=random&type=ws&host=${部署域名}&path=pyip%3D${反代IP}#de 德国 DE
vless://${我的VL密钥}@188.114.96.0:443?encryption=none&security=tls&sni=${部署域名}&fp=random&type=ws&host=${部署域名}&path=pyip%3D${反代IP}#nl 荷兰 NL

更多节点使用手搓节点生成器： http://ip.cloudip.ggff.net`, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
        } 
       // ↓↓↓ 订阅端点（多源轮询 + 超时 + 兜底） ↓↓↓
        else if (请求路径 === '/subvless') {
            // 按优先级排列：镜像源优先，官方源兜底；全部失败则用内置节点
            const 订阅源列表 = [
                'https://gith-ub.lzgzg.qzz.io/https://raw.githubusercontent.com/luochen1975/CloudflareIP/main/Me.txt',
                'https://raw.githubusercontent.com/luochen1975/CloudflareIP/main/Me.txt',
            ];
            const 兜底节点 = [
                '104.18.0.0#us 兜底',
                '108.162.192.0#sg 兜底',
                '188.114.96.0#nl 兜底',
            ];

            let 原始文本 = '';
            for (const 源地址 of 订阅源列表) {
                const 控制器 = new AbortController();
                const 定时器 = setTimeout(() => 控制器.abort(), 6000); // 6秒超时，防边缘节点卡死
                try {
                    const 响应 = await fetch(源地址, {
                        signal: 控制器.signal,
                        cf: { cacheTtl: 300, cacheEverything: true }, // 边缘缓存5分钟，少打源站
                    });
                    if (!响应.ok) continue; // HTTP 错误状态（404/503...）也算失败，换下一个源
                    const 内容 = await 响应.text();
                    if (内容.trim()) { 原始文本 = 内容; break; }
                } catch (e) {
                    console.error('订阅源拉取失败:', 源地址, e); // 超时/连接拒绝在这里被吃掉，不再崩溃
                } finally {
                    clearTimeout(定时器);
                }
            }

          
            const 行列表 = (原始文本.trim() || 兜底节点.join('\n')).split('\n');
            const 链接列表 = [];
            for (const 行内容 of 行列表) {
                const 清洗后 = 行内容.trim();
                if (!清洗后 || 清洗后.startsWith('#')) continue; // 跳过空行和注释行
                const [IP部分, 名称部分 = 'CF'] = 清洗后.split('#');
                const IP = IP部分.trim();
                if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(IP)) continue; // 只保留合法IPv4
                const 名称 = 名称部分.trim() || 'CF';
                链接列表.push(`vless://${我的VL密钥}@${IP}:443?encryption=none&security=tls&sni=${部署域名}&fp=random&type=ws&host=${部署域名}&path=pyip%3D${反代IP}#${encodeURIComponent(名称)}`);
            }
            if (链接列表.length === 0) {
                return new Response('no valid nodes', { status: 502 });
            }
            const Base64订阅 = btoa(链接列表.join('\n'));
            return new Response(Base64订阅, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
        }
        // ↑↑↑ 订阅端点结束 ↑↑↑
        else {
            // 其他路径交给静态资源（生成器页面）
            return env.ASSETS.fetch(访问请求);
        }
    }
  }
};
async function 启动传输管道(WS接口, TCP接口) {
  let 识别地址类型, 访问地址, 地址长度, 首包数据 = false, 首包处理完成 = null, 传输数据, 读取数据, 传输队列 = Promise.resolve();
  try {
    WS接口.addEventListener('message', async event => {
      if (!首包数据) {
        首包数据 = true;
        首包处理完成 = 解析首包数据(event.data);
        传输队列 = 传输队列.then(() => 首包处理完成).catch(e => { throw (e) });
      } else {
        await 首包处理完成;
        传输队列 = 传输队列.then(() => 传输数据.write(event.data)).catch(e => { throw (e) });
      }
    });
    async function 解析首包数据(首包数据) {
      const 二进制数据 = new Uint8Array(首包数据);
      const 协议头 = 二进制数据[0];
      const 验证VL的密钥 = (a, i = 0) => [...a.slice(i, i + 16)].map(b => b.toString(16).padStart(2, '0')).join('').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
      if (验证VL的密钥(二进制数据.slice(1, 17)) !== 我的VL密钥) throw new Error('UUID验证失败');
      const 提取端口索引 = 18 + 二进制数据[17] + 1;
      const 访问端口 = new DataView(二进制数据.buffer, 提取端口索引, 2).getUint16(0);
      const 提取地址索引 = 提取端口索引 + 2;
      识别地址类型 = 二进制数据[提取地址索引];
      let 地址信息索引 = 提取地址索引 + 1;
      switch (识别地址类型) {
        case 1:
          地址长度 = 4;
          访问地址 = 二进制数据.slice(地址信息索引, 地址信息索引 + 地址长度).join('.');
          break;
        case 2:
          地址长度 = 二进制数据[地址信息索引];
          地址信息索引 += 1;
          访问地址 = new TextDecoder().decode(二进制数据.slice(地址信息索引, 地址信息索引 + 地址长度));
          break;
        case 3:
          地址长度 = 16;
          const ipv6 = [];
          const 读取IPV6地址 = new DataView(二进制数据.buffer, 地址信息索引, 16);
          for (let i = 0; i < 8; i++) ipv6.push(读取IPV6地址.getUint16(i * 2).toString(16));
          访问地址 = ipv6.join(':');
          break;
        default:
          throw new Error('无效的访问地址');
      }
      try {
        if (识别地址类型 === 3) {
          const 转换IPV6地址 = `[${访问地址}]`
          TCP接口 = connect({ hostname: 转换IPV6地址, port: 访问端口 });
        } else {
          TCP接口 = connect({ hostname: 访问地址, port: 访问端口 });
        }
        await TCP接口.opened;
      } catch {
        if (!反代IP) throw new Error('直连失败且未配置反代IP');
        const [反代IP地址, 反代IP端口 = 443] = 反代IP.split(':');
        TCP接口 = connect({ hostname: 反代IP地址, port: Number(反代IP端口) });
        await TCP接口.opened;
      }
      传输数据 = TCP接口.writable.getWriter();
      读取数据 = TCP接口.readable.getReader();
      const 写入初始数据 = 二进制数据.slice(地址信息索引 + 地址长度);
      if (写入初始数据.length > 0) try { await 传输数据.write(写入初始数据) } catch (e) { throw (e) };
      WS接口.send(new Uint8Array([协议头, 0]));
      启动回传管道();
    }
    async function 启动回传管道() {
      while (true) {
        await 传输队列;
        const { done: 流结束, value: 返回数据 } = await 读取数据.read();
        if (返回数据 && 返回数据.length > 0) {
          传输队列 = 传输队列.then(() => WS接口.send(返回数据)).catch(e => { throw (e) });
        }
        if (流结束) break;
      }
      throw new Error('传输完成');
    }
  } catch (e) {
    try { await TCP接口?.close?.() } catch {};
    try { WS接口?.close?.() } catch {};
  }
}
