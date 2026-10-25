export function SiteLogo({ size = 32 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm"
      style={{ width: size, height: size }}
    >
      BS
    </div>
  )
}
