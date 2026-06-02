export function IcpLink({ className = "" }: { className?: string }) {
  return (
    <a className={`icp-link ${className}`.trim()} href="https://beian.miit.gov.cn/" rel="noreferrer" target="_blank">
      鄂ICP备2026023999号
    </a>
  );
}

