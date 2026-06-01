import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import { Input } from './components/ui/input'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-800 mb-8 text-center">
          Vite + React + Tailwind + shadcn/ui
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4 text-slate-700">按钮组件</h2>
            <div className="flex flex-wrap gap-3">
              <Button>默认按钮</Button>
              <Button variant="secondary">次要按钮</Button>
              <Button variant="destructive">危险按钮</Button>
              <Button variant="outline">轮廓按钮</Button>
              <Button variant="ghost">幽灵按钮</Button>
            </div>
          </Card>
          
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4 text-slate-700">表单元素</h2>
            <div className="space-y-4">
              <Input placeholder="请输入内容..." />
              <Input type="email" placeholder="请输入邮箱..." />
              <Input type="password" placeholder="请输入密码..." />
            </div>
          </Card>
          
          <Card className="p-6 md:col-span-2">
            <h2 className="text-2xl font-semibold mb-4 text-slate-700">特性展示</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <h3 className="font-medium text-slate-600 mb-2">快速开发</h3>
                <p className="text-sm text-slate-500">Vite 提供极快的热更新体验</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <h3 className="font-medium text-slate-600 mb-2">响应式设计</h3>
                <p className="text-sm text-slate-500">Tailwind CSS 实现完美适配</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <h3 className="font-medium text-slate-600 mb-2">精美组件</h3>
                <p className="text-sm text-slate-500">shadcn/ui 提供高品质组件</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <h3 className="font-medium text-slate-600 mb-2">易于定制</h3>
                <p className="text-sm text-slate-500">完全可自定义的组件和样式</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default App
