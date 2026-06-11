with open(r"C:\Users\wei.gu\Documents\demogo\server\src\queue\queue.js", "rb") as f:
    data = f.read()

# Make queue name configurable
old = b'export const deploymentQueue = new Queue("demogo-deployments", {'
new = b'const queueName = process.env.DEMOGO_QUEUE_NAME || "demogo-deployments";\nexport const deploymentQueue = new Queue(queueName, {'
data = data.replace(old, new)

with open(r"C:\Users\wei.gu\Documents\demogo\server\src\queue\queue.js", "wb") as f:
    f.write(data)
print("Made queue name configurable")
