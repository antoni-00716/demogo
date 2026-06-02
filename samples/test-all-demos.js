const fs = require('fs');
const path = require('path');

const samplesDir = __dirname;

// 自动扫描所有子文件夹中的项目
function scanAllProjects() {
  const projects = [];
  const categoryDirs = ['01-static', '02-frontend', '03-nodejs', '04-special'];
  
  categoryDirs.forEach(category => {
    const categoryPath = path.join(samplesDir, category);
    if (fs.existsSync(categoryPath)) {
      const items = fs.readdirSync(categoryPath);
      items.forEach(item => {
        const itemPath = path.join(categoryPath, item);
        if (fs.statSync(itemPath).isDirectory()) {
          projects.push({
            name: item,
            path: itemPath,
            category: category
          });
        }
      });
    }
  });
  
  return projects;
}

const demoProjects = scanAllProjects();

console.log('='.repeat(60));
console.log('DemoGo 项目分类测试');
console.log('='.repeat(60));
console.log();

const results = [];
let currentCategory = '';

demoProjects.forEach(project => {
  if (project.category !== currentCategory) {
    if (currentCategory) {
      console.log();
    }
    console.log(`📂 ${project.category}`);
    console.log('─'.repeat(60));
    currentCategory = project.category;
  }
  
  const projectPath = project.path;
  const demogoConfigPath = path.join(projectPath, '.demogo', 'project.json');
  const packageJsonPath = path.join(projectPath, 'package.json');
  const readmePath = path.join(projectPath, 'README.md');
  
  console.log(`📁 ${project.name}`);
  
  const result = {
    name: project.name,
    category: project.category,
    exists: true,
    hasDemogoConfig: fs.existsSync(demogoConfigPath),
    hasPackageJson: fs.existsSync(packageJsonPath),
    hasReadme: fs.existsSync(readmePath),
    config: null
  };

  if (result.hasDemogoConfig) {
    try {
      const config = JSON.parse(fs.readFileSync(demogoConfigPath, 'utf-8'));
      result.config = config;
      console.log(`  ✅ .demogo/project.json: ${config.demoType}`);
      console.log(`     名称: ${config.name}`);
    } catch (e) {
      console.log(`  ❌ .demogo/project.json: 解析失败 - ${e.message}`);
    }
  } else {
    console.log(`  ❌ .demogo/project.json: 不存在`);
  }

  if (result.hasReadme) {
    console.log(`  ✅ README.md`);
  }

  if (result.hasPackageJson) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      console.log(`  ✅ package.json`);
    } catch (e) {
      console.log(`  ❌ package.json: 解析失败 - ${e.message}`);
    }
  }

  results.push(result);
});

console.log();
console.log('='.repeat(60));
console.log('测试总结');
console.log('='.repeat(60));

const passed = results.filter(r => r.exists && r.hasDemogoConfig).length;
const total = demoProjects.length;

console.log();
console.log(`总项目数: ${total}`);
console.log(`通过项目: ${passed} / ${total}`);
console.log();

// 按分类统计
console.log('📊 分类统计：');
const categoryStats = {};
results.forEach(r => {
  if (!categoryStats[r.category]) {
    categoryStats[r.category] = 0;
  }
  categoryStats[r.category]++;
});

Object.entries(categoryStats).forEach(([cat, count]) => {
  console.log(`  ${cat}: ${count} 个项目`);
});

console.log();
console.log('='.repeat(60));
console.log('项目类型覆盖');
console.log('='.repeat(60));
console.log();

const typesCovered = {};
results.forEach(r => {
  if (r.config && r.config.demoType) {
    typesCovered[r.config.demoType] = (typesCovered[r.config.demoType] || 0) + 1;
  }
});

Object.entries(typesCovered).forEach(([type, count]) => {
  console.log(`  ${type}: ${count} 个项目`);
});

console.log();
console.log('='.repeat(60));
console.log('测试完成！');
console.log('='.repeat(60));
