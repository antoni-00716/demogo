-- DemoGo MySQL 试用数据库初始化脚本
-- 测试表结构

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  category VARCHAR(100),
  stock INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  total_amount DECIMAL(10, 2) NOT NULL,
  status ENUM('pending', 'confirmed', 'shipped', 'delivered') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 插入测试数据
INSERT INTO products (name, description, price, category, stock) VALUES
('无线蓝牙耳机', '高音质无线蓝牙耳机，降噪功能', 299.00, '电子产品', 50),
('机械键盘', 'RGB背光机械键盘，青轴', 459.00, '电脑配件', 30),
('笔记本电脑支架', '铝合金可调节笔记本支架', 129.00, '办公用品', 100),
('移动电源', '20000mAh大容量移动电源', 159.00, '电子产品', 80),
('无线鼠标', '静音无线鼠标，长续航', 89.00, '电脑配件', 120);

INSERT INTO orders (product_id, quantity, customer_name, customer_email, total_amount, status) VALUES
(1, 2, '张三', 'zhangsan@example.com', 598.00, 'confirmed'),
(2, 1, '李四', 'lisi@example.com', 459.00, 'pending'),
(3, 3, '王五', 'wangwu@example.com', 387.00, 'shipped');