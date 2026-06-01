#!/usr/bin/env node
import { classifyProject } from "../services/project-classifier-service.js";

const results = [];
let passed = 0;
let failed = 0;

console.log("\n🚀 DemoGo 项目类型完整测试\n");
console.log("=".repeat(60));

function test(name, expectedType, analysis, context = {}) {
  console.log(`\n📦 测试: ${name}`);
  try {
    const result = classifyProject(analysis, context);
    const actualType = result.type;
    const isSupported = result.supported;
    const supportStatus = result.supportStatus;

    const success = actualType === expectedType;
    
    if (success) {
      passed++;
      console.log(`  ✅ 识别正确: ${result.label}`);
      console.log(`     支持状态: ${supportStatus} (${isSupported ? "已支持" : "暂不支持"})`);
      if (result.framework) {
        console.log(`     框架: ${result.framework}`);
      }
      if (result.buildTool) {
        console.log(`     构建工具: ${result.buildTool}`);
      }
    } else {
      failed++;
      console.log(`  ❌ 识别失败`);
      console.log(`     期望: ${expectedType}`);
      console.log(`     实际: ${actualType}`);
    }

    results.push({
      name,
      expected: expectedType,
      actual: actualType,
      success,
      supported: isSupported,
      supportStatus,
      result
    });
  } catch (error) {
    failed++;
    console.log(`  ❌ 测试异常: ${error.message}`);
    results.push({
      name,
      expected: expectedType,
      actual: "error",
      success: false,
      error: error.message
    });
  }
}

// 1. 静态网站
test("静态网站 (index.html)", "static_site", {
  paths: ["index.html", "css/style.css", "js/main.js"],
  hasPackageJson: false
}, {
  detectedType: "static-root"
});

// 2. 多页网站
test("多页网站 (多个HTML)", "mpa", {
  paths: ["index.html", "about.html", "contact.html", "css/style.css"],
  hasPackageJson: false
});

// 3. SPA应用 (dist目录)
test("SPA应用 (dist产物)", "spa", {
  paths: ["dist/index.html", "dist/assets/app.js", "dist/assets/style.css"],
  hasPackageJson: false
}, {
  detectedType: "dist"
});

// 4. 前端源码项目 (React + Vite)
test("前端源码项目 (React + Vite)", "frontend_build", {
  paths: ["src/App.jsx", "src/main.jsx", "vite.config.js", "index.html"],
  packageDependencies: {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "vite": "^5.0.0"
  },
  packageScripts: {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  hasPackageJson: true
}, {
  hasBuildScript: true
});

// 5. 前端源码项目 (Vue + Vite)
test("前端源码项目 (Vue + Vite)", "frontend_build", {
  paths: ["src/App.vue", "src/main.js", "vite.config.js", "index.html"],
  packageDependencies: {
    "vue": "^3.3.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-vue": "^5.0.0"
  },
  packageScripts: {
    "dev": "vite",
    "build": "vite build"
  },
  hasPackageJson: true
}, {
  hasBuildScript: true
});

// 6. 前端源码项目 (Svelte)
test("前端源码项目 (Svelte)", "frontend_build", {
  paths: ["src/App.svelte", "src/main.js", "svelte.config.js", "vite.config.js"],
  packageDependencies: {
    "svelte": "^4.2.0",
    "vite": "^5.0.0",
    "@sveltejs/vite-plugin-svelte": "^3.0.0"
  },
  packageScripts: {
    "dev": "vite",
    "build": "vite build"
  },
  hasPackageJson: true
}, {
  hasBuildScript: true
});

// 7. 前端源码项目 (Solid)
test("前端源码项目 (Solid)", "frontend_build", {
  paths: ["src/App.jsx", "src/index.jsx", "vite.config.js"],
  packageDependencies: {
    "solid-js": "^1.8.0",
    "vite": "^5.0.0",
    "vite-plugin-solid": "^2.8.0"
  },
  packageScripts: {
    "dev": "vite",
    "build": "vite build"
  },
  hasPackageJson: true
}, {
  hasBuildScript: true
});

// 8. 前端源码项目 (Astro)
test("前端源码项目 (Astro)", "frontend_build", {
  paths: ["src/pages/index.astro", "astro.config.js"],
  packageDependencies: {
    "astro": "^4.0.0"
  },
  packageScripts: {
    "dev": "astro dev",
    "build": "astro build"
  },
  hasPackageJson: true
}, {
  hasBuildScript: true
});

// 9. 全栈框架 (Next.js)
test("全栈框架 (Next.js)", "fullstack_framework", {
  paths: ["app/page.js", "app/layout.js", "next.config.js"],
  packageDependencies: {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  packageScripts: {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  hasPackageJson: true
}, {
  hasSsr: true,
  hasBuildScript: true
});

// 10. 全栈框架 (Nuxt)
test("全栈框架 (Nuxt)", "fullstack_framework", {
  paths: ["pages/index.vue", "nuxt.config.ts"],
  packageDependencies: {
    "nuxt": "^3.8.0",
    "vue": "^3.3.0"
  },
  packageScripts: {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "start": "nuxt start"
  },
  hasPackageJson: true
}, {
  hasSsr: true,
  hasBuildScript: true
});

// 11. 全栈框架 (TanStack Start)
test("全栈框架 (TanStack Start)", "fullstack_framework", {
  paths: ["app/routes/index.tsx", "app.config.ts"],
  packageDependencies: {
    "@tanstack/react-start": "^1.0.0",
    "react": "^18.2.0"
  },
  packageScripts: {
    "dev": "start dev",
    "build": "start build",
    "start": "start start"
  },
  hasPackageJson: true
}, {
  hasSsr: true,
  hasBuildScript: true
});

// 12. 全栈框架 (SvelteKit)
test("全栈框架 (SvelteKit)", "fullstack_framework", {
  paths: ["src/routes/+page.svelte", "svelte.config.js"],
  packageDependencies: {
    "@sveltejs/kit": "^2.0.0",
    "svelte": "^4.2.0"
  },
  packageScripts: {
    "dev": "vite dev",
    "build": "vite build",
    "start": "node build"
  },
  hasPackageJson: true
}, {
  hasSsr: true,
  hasBuildScript: true
});

// 13. H5页面
test("H5页面 (Vant)", "h5_page", {
  paths: ["index.html", "js/main.js", "css/mobile.css"],
  projectTitle: "移动端营销活动页"
}, {
  detectedType: "static-root"
});

// 14. 数据看板 (ECharts)
test("数据看板 (ECharts)", "dashboard", {
  paths: ["index.html", "js/dashboard.js"],
  packageDependencies: {
    "echarts": "^5.4.0"
  },
  projectTitle: "数据运营看板",
  hasPackageJson: true
}, {
  detectedType: "static-root"
});

// 15. 数据看板 (AntV G2)
test("数据看板 (AntV G2)", "dashboard", {
  paths: ["index.html", "src/app.js"],
  packageDependencies: {
    "@antv/g2": "^5.1.0"
  },
  pageHeading: "后台监控系统",
  hasPackageJson: true
}, {
  detectedType: "static-root"
});

// 16. 数字大屏 (Three.js)
test("数字大屏 (Three.js)", "big_screen", {
  paths: ["index.html", "js/scene.js"],
  packageDependencies: {
    "three": "^0.160.0"
  },
  projectTitle: "数字孪生指挥中心",
  hasPackageJson: true
}, {
  detectedType: "static-root"
});

// 17. AI应用前端 (OpenAI)
test("AI应用前端 (OpenAI)", "ai_frontend", {
  paths: ["src/App.jsx", "vite.config.js", "index.html"],
  packageDependencies: {
    "react": "^18.2.0",
    "openai": "^4.20.0",
    "vite": "^5.0.0"
  },
  packageScripts: {
    "dev": "vite",
    "build": "vite build"
  },
  projectTitle: "AI Chatbot 智能助手",
  hasPackageJson: true
}, {
  hasBuildScript: true
});

// 18. AI应用前端 (LangChain)
test("AI应用前端 (LangChain)", "ai_frontend", {
  paths: ["src/pages/index.tsx", "next.config.js"],
  packageDependencies: {
    "next": "^14.0.0",
    "@langchain/openai": "^0.0.0",
    "langchain": "^0.1.0"
  },
  packageScripts: {
    "dev": "next dev",
    "build": "next build"
  },
  projectTitle: "智能体应用",
  hasPackageJson: true
}, {
  hasSsr: true,
  hasBuildScript: true
});

// 19. Web3应用前端 (Ethers)
test("Web3应用前端 (Ethers)", "web3_frontend", {
  paths: ["src/App.jsx", "vite.config.js", "index.html"],
  packageDependencies: {
    "react": "^18.2.0",
    "ethers": "^6.9.0",
    "wagmi": "^1.4.0"
  },
  packageScripts: {
    "dev": "vite",
    "build": "vite build"
  },
  projectTitle: "DApp 钱包连接",
  hasPackageJson: true
}, {
  hasBuildScript: true
});

// 20. Web3应用前端 (Viem)
test("Web3应用前端 (Viem)", "web3_frontend", {
  paths: ["src/App.vue", "vite.config.js"],
  packageDependencies: {
    "vue": "^3.3.0",
    "viem": "^1.19.0",
    "web3": "^4.3.0"
  },
  packageScripts: {
    "dev": "vite",
    "build": "vite build"
  },
  projectTitle: "NFT 市场",
  hasPackageJson: true
}, {
  hasBuildScript: true
});

// 21. Node.js单服务 (Express)
test("Node.js服务 (Express)", "node_service", {
  paths: ["server.js", "routes/api.js"],
  packageDependencies: {
    "express": "^4.18.0"
  },
  packageScripts: {
    "start": "node server.js"
  },
  hasPackageJson: true
}, {
  hasBackend: true
});

// 22. Node.js单服务 (Koa)
test("Node.js服务 (Koa)", "node_service", {
  paths: ["app.js", "src/routes/index.js"],
  packageDependencies: {
    "koa": "^2.14.0",
    "koa-router": "^12.0.0"
  },
  packageScripts: {
    "start": "node app.js"
  },
  hasPackageJson: true
}, {
  hasBackend: true
});

// 23. Node.js单服务 (Fastify)
test("Node.js服务 (Fastify)", "node_service", {
  paths: ["src/server.js"],
  packageDependencies: {
    "fastify": "^4.24.0"
  },
  packageScripts: {
    "start": "node src/server.js"
  },
  hasPackageJson: true
}, {
  hasBackend: true
});

// 24. Node.js单服务 (Hono)
test("Node.js服务 (Hono)", "node_service", {
  paths: ["src/index.js"],
  packageDependencies: {
    "hono": "^3.11.0"
  },
  packageScripts: {
    "start": "node src/index.js"
  },
  hasPackageJson: true
}, {
  hasBackend: true
});

// 25. Node.js单服务 (NestJS)
test("Node.js服务 (NestJS)", "node_service", {
  paths: ["src/main.ts", "src/app.module.ts"],
  packageDependencies: {
    "@nestjs/core": "^10.2.0",
    "@nestjs/common": "^10.2.0"
  },
  packageScripts: {
    "start": "nest start"
  },
  hasPackageJson: true
}, {
  hasBackend: true
});

// 26. Node.js + MySQL
test("Node.js服务 + MySQL", "node_service", {
  paths: ["server.js", "schema.sql"],
  packageDependencies: {
    "express": "^4.18.0",
    "mysql2": "^3.6.0"
  },
  packageScripts: {
    "start": "node server.js"
  },
  envHints: ["MYSQL_HOST", "MYSQL_PORT", "MYSQL_DATABASE"],
  hasPackageJson: true
}, {
  hasBackend: true
});

// 27. Node.js + Prisma + MySQL
test("Node.js服务 + Prisma + MySQL", "node_service", {
  paths: ["src/server.js", "prisma/schema.prisma"],
  packageDependencies: {
    "express": "^4.18.0",
    "@prisma/client": "^5.7.0",
    "prisma": "^5.7.0"
  },
  packageScripts: {
    "start": "node src/server.js"
  },
  hasPackageJson: true
}, {
  hasBackend: true
});

// 28. 小程序源码
test("小程序源码", "mini_program_source", {
  paths: ["app.json", "pages/index/index.js", "pages/index/index.wxml"],
  packageDependencies: {},
  hasPackageJson: false
});

// 29. 桌面应用源码 (Electron)
test("桌面应用 (Electron)", "desktop_app_source", {
  paths: ["main.js", "preload.js", "renderer/index.html"],
  packageDependencies: {
    "electron": "^28.0.0"
  },
  packageScripts: {
    "start": "electron ."
  },
  hasPackageJson: true
});

// 30. 桌面应用源码 (Tauri)
test("桌面应用 (Tauri)", "desktop_app_source", {
  paths: ["src-tauri/Cargo.toml", "src-tauri/src/main.rs", "src/App.jsx"],
  packageDependencies: {
    "@tauri-apps/api": "^1.5.0",
    "react": "^18.2.0",
    "vite": "^5.0.0"
  },
  packageScripts: {
    "tauri": "tauri",
    "dev": "vite"
  },
  hasPackageJson: true
});

// 31. 移动App源码 (React Native)
test("移动App (React Native)", "mobile_native_source", {
  paths: ["App.js", "android/", "ios/"],
  packageDependencies: {
    "react-native": "^0.73.0",
    "react": "^18.2.0"
  },
  packageScripts: {
    "start": "react-native start",
    "android": "react-native run-android"
  },
  hasPackageJson: true
});

// 32. 移动App源码 (Flutter)
test("移动App (Flutter)", "mobile_native_source", {
  paths: ["pubspec.yaml", "lib/main.dart", "android/", "ios/"],
  packageDependencies: {},
  hasPackageJson: false
});

// 33. 移动App源码 (UniApp)
test("移动App (UniApp)", "mobile_native_source", {
  paths: ["pages.json", "manifest.json", "src/App.vue"],
  packageDependencies: {
    "@dcloudio/uni-app": "^3.0.0",
    "vue": "^3.3.0"
  },
  hasPackageJson: true
});

// 34. 后端服务项目 (复杂后端)
test("后端服务项目", "backend_service", {
  paths: ["src/server.js", "src/services/user.js", "src/models/"],
  packageDependencies: {
    "express": "^4.18.0",
    "mongoose": "^8.0.0",
    "redis": "^4.6.0"
  },
  packageScripts: {
    "start": "node src/server.js"
  },
  hasPackageJson: true
}, {
  hasBackend: true
});

// 35. 未知项目
test("未知项目", "unknown", {
  paths: ["README.md", "docs/"],
  packageDependencies: {},
  hasPackageJson: false
});

// 总结
console.log("\n" + "=".repeat(60));
console.log("\n📊 测试结果汇总\n");

const supportedTypes = results.filter(r => r.supported);
const unsupportedTypes = results.filter(r => !r.supported && r.success);

console.log(`✅ 正确识别: ${passed}/${passed + failed}`);
console.log(`📦 支持类型: ${supportedTypes.length} 种`);
console.log(`❌ 不支持类型: ${unsupportedTypes.length} 种`);

console.log("\n🎯 支持的项目类型:");
supportedTypes.forEach(r => {
  console.log(`  - ${r.name}: ${r.result.label}`);
});

console.log("\n⚠️  暂不支持的项目类型:");
unsupportedTypes.forEach(r => {
  console.log(`  - ${r.name}: ${r.result.label}`);
  if (r.result.unsupportedReasons?.length) {
    console.log(`     原因: ${r.result.unsupportedReasons.join(", ")}`);
  }
});

if (failed > 0) {
  console.log("\n❌ 识别失败的项目:");
  results.filter(r => !r.success).forEach(r => {
    console.log(`  - ${r.name}`);
    console.log(`    期望: ${r.expected}, 实际: ${r.actual}`);
  });
}

console.log("\n" + "=".repeat(60));
console.log("\n🎉 测试完成!");

process.exit(failed > 0 ? 1 : 0);
