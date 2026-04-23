import Image from "next/image"

/** Public asset: `public/UNLEASH logo.png` (encode space in URL) */
export const UNLEASH_LOGO_SRC = "/UNLEASH%20logo.png" as const

type UnleashLogoProps = {
  className?: string
  /** Wide horizontal logo — default tuned for sidebars/headers */
  width?: number
  height?: number
  priority?: boolean
}

export function UnleashLogo({
  className,
  width = 220,
  height = 66,
  priority = false,
}: UnleashLogoProps) {
  return (
    <Image
      src={UNLEASH_LOGO_SRC}
      alt="Unleashed Brands"
      width={width}
      height={height}
      className={className}
      priority={priority}
    />
  )
}
