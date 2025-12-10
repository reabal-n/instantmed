"use client"

import { useEffect, useRef, useState } from "react"
import lottie, { type AnimationItem } from "lottie-web"

// Inline Lottie JSON data for our icons - these are lightweight custom animations
const medCertAnimation = {
  v: "5.7.4",
  fr: 30,
  ip: 0,
  op: 60,
  w: 100,
  h: 100,
  layers: [
    {
      ty: 4,
      nm: "doc",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: {
          a: 1,
          k: [
            { t: 0, s: [0], e: [-5] },
            { t: 15, s: [-5], e: [5] },
            { t: 30, s: [5], e: [-5] },
            { t: 45, s: [-5], e: [0] },
            { t: 60, s: [0] },
          ],
        },
        p: { a: 0, k: [50, 50] },
        a: { a: 0, k: [0, 0] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [100, 100], e: [105, 105] },
            { t: 30, s: [105, 105], e: [100, 100] },
            { t: 60, s: [100, 100] },
          ],
        },
      },
      shapes: [
        {
          ty: "rc",
          d: 1,
          s: { a: 0, k: [50, 65] },
          p: { a: 0, k: [0, 0] },
          r: { a: 0, k: 6 },
        },
        { ty: "st", c: { a: 0, k: [0, 0.886, 0.71, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 4 } },
        { ty: "fl", c: { a: 0, k: [0, 0.886, 0.71, 0.15] }, o: { a: 0, k: 100 } },
      ],
    },
    {
      ty: 4,
      nm: "check",
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: 20, s: [0], e: [100] },
            { t: 35, s: [100] },
          ],
        },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [50, 50] },
        s: {
          a: 1,
          k: [
            { t: 20, s: [0, 0], e: [120, 120] },
            { t: 35, s: [120, 120], e: [100, 100] },
            { t: 45, s: [100, 100] },
          ],
        },
      },
      shapes: [
        {
          ty: "sh",
          ks: {
            a: 0,
            k: {
              c: false,
              v: [
                [-12, 0],
                [-4, 8],
                [12, -8],
              ],
            },
          },
        },
        { ty: "st", c: { a: 0, k: [0, 0.886, 0.71, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 5 }, lc: 2, lj: 2 },
      ],
    },
  ],
}

const pillAnimation = {
  v: "5.7.4",
  fr: 30,
  ip: 0,
  op: 60,
  w: 100,
  h: 100,
  layers: [
    {
      ty: 4,
      nm: "pill",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: {
          a: 1,
          k: [
            { t: 0, s: [45], e: [50] },
            { t: 15, s: [50], e: [40] },
            { t: 30, s: [40], e: [50] },
            { t: 45, s: [50], e: [45] },
            { t: 60, s: [45] },
          ],
        },
        p: {
          a: 1,
          k: [
            { t: 0, s: [50, 50], e: [50, 45] },
            { t: 20, s: [50, 45], e: [50, 55] },
            { t: 40, s: [50, 55], e: [50, 50] },
            { t: 60, s: [50, 50] },
          ],
        },
        s: { a: 0, k: [100, 100] },
      },
      shapes: [
        {
          ty: "rc",
          d: 1,
          s: { a: 0, k: [22, 50] },
          p: { a: 0, k: [0, 0] },
          r: { a: 0, k: 11 },
        },
        { ty: "st", c: { a: 0, k: [0.024, 0.714, 0.831, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 3 } },
        { ty: "fl", c: { a: 0, k: [0.024, 0.714, 0.831, 0.2] }, o: { a: 0, k: 100 } },
      ],
    },
    {
      ty: 4,
      nm: "sparkle1",
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: 0, s: [0], e: [100] },
            { t: 10, s: [100], e: [0] },
            { t: 30, s: [0], e: [100] },
            { t: 40, s: [100], e: [0] },
            { t: 60, s: [0] },
          ],
        },
        p: { a: 0, k: [75, 30] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [0, 0], e: [100, 100] },
            { t: 10, s: [100, 100], e: [0, 0] },
            { t: 30, s: [0, 0], e: [100, 100] },
            { t: 40, s: [100, 100], e: [0, 0] },
            { t: 60, s: [0, 0] },
          ],
        },
      },
      shapes: [
        { ty: "el", s: { a: 0, k: [8, 8] }, p: { a: 0, k: [0, 0] } },
        { ty: "fl", c: { a: 0, k: [0.024, 0.714, 0.831, 1] }, o: { a: 0, k: 100 } },
      ],
    },
  ],
}

const referralAnimation = {
  v: "5.7.4",
  fr: 30,
  ip: 0,
  op: 60,
  w: 100,
  h: 100,
  layers: [
    {
      ty: 4,
      nm: "stethoscope",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: {
          a: 1,
          k: [
            { t: 0, s: [0], e: [10] },
            { t: 20, s: [10], e: [-10] },
            { t: 40, s: [-10], e: [0] },
            { t: 60, s: [0] },
          ],
        },
        p: { a: 0, k: [50, 50] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [100, 100], e: [105, 105] },
            { t: 30, s: [105, 105], e: [100, 100] },
            { t: 60, s: [100, 100] },
          ],
        },
      },
      shapes: [
        { ty: "el", s: { a: 0, k: [35, 35] }, p: { a: 0, k: [0, 5] } },
        { ty: "st", c: { a: 0, k: [0.545, 0.361, 0.965, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 4 } },
        {
          ty: "sh",
          ks: {
            a: 0,
            k: {
              c: false,
              v: [
                [-17, -12],
                [-17, -25],
                [17, -25],
                [17, -12],
              ],
            },
          },
        },
        { ty: "st", c: { a: 0, k: [0.545, 0.361, 0.965, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 4 } },
      ],
    },
    {
      ty: 4,
      nm: "heart",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        p: { a: 0, k: [50, 55] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [80, 80], e: [100, 100] },
            { t: 15, s: [100, 100], e: [80, 80] },
            { t: 30, s: [80, 80], e: [100, 100] },
            { t: 45, s: [100, 100], e: [80, 80] },
            { t: 60, s: [80, 80] },
          ],
        },
      },
      shapes: [
        { ty: "el", s: { a: 0, k: [12, 12] }, p: { a: 0, k: [0, 0] } },
        { ty: "fl", c: { a: 0, k: [0.545, 0.361, 0.965, 1] }, o: { a: 0, k: 100 } },
      ],
    },
  ],
}

const pathologyAnimation = {
  v: "5.7.4",
  fr: 30,
  ip: 0,
  op: 60,
  w: 100,
  h: 100,
  layers: [
    {
      ty: 4,
      nm: "tube",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: {
          a: 1,
          k: [
            { t: 0, s: [0], e: [15] },
            { t: 15, s: [15], e: [-15] },
            { t: 30, s: [-15], e: [15] },
            { t: 45, s: [15], e: [0] },
            { t: 60, s: [0] },
          ],
        },
        p: { a: 0, k: [50, 50] },
        s: { a: 0, k: [100, 100] },
      },
      shapes: [
        {
          ty: "rc",
          d: 1,
          s: { a: 0, k: [25, 55] },
          p: { a: 0, k: [0, 5] },
          r: { a: 0, k: 8 },
        },
        { ty: "st", c: { a: 0, k: [0.961, 0.62, 0.043, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 3 } },
      ],
    },
    {
      ty: 4,
      nm: "liquid",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        p: { a: 0, k: [50, 60] },
        s: { a: 0, k: [100, 100] },
      },
      shapes: [
        {
          ty: "rc",
          d: 1,
          s: {
            a: 1,
            k: [
              { t: 0, s: [19, 25], e: [19, 35] },
              { t: 30, s: [19, 35], e: [19, 25] },
              { t: 60, s: [19, 25] },
            ],
          },
          p: {
            a: 1,
            k: [
              { t: 0, s: [0, 10], e: [0, 5] },
              { t: 30, s: [0, 5], e: [0, 10] },
              { t: 60, s: [0, 10] },
            ],
          },
          r: { a: 0, k: 6 },
        },
        { ty: "fl", c: { a: 0, k: [0.961, 0.62, 0.043, 0.5] }, o: { a: 0, k: 100 } },
      ],
    },
    {
      ty: 4,
      nm: "bubble1",
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: 0, s: [100], e: [0] },
            { t: 20, s: [0], e: [100] },
            { t: 40, s: [100], e: [0] },
            { t: 60, s: [0] },
          ],
        },
        p: {
          a: 1,
          k: [
            { t: 0, s: [45, 65], e: [45, 45] },
            { t: 20, s: [45, 45], e: [45, 65] },
            { t: 40, s: [55, 65], e: [55, 45] },
            { t: 60, s: [55, 45] },
          ],
        },
        s: { a: 0, k: [100, 100] },
      },
      shapes: [
        { ty: "el", s: { a: 0, k: [5, 5] }, p: { a: 0, k: [0, 0] } },
        { ty: "fl", c: { a: 0, k: [0.961, 0.62, 0.043, 1] }, o: { a: 0, k: 100 } },
      ],
    },
  ],
}

const clockAnimation = {
  v: "5.7.4",
  fr: 30,
  ip: 0,
  op: 60,
  w: 100,
  h: 100,
  layers: [
    {
      ty: 4,
      nm: "circle",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        p: { a: 0, k: [50, 50] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [100, 100], e: [105, 105] },
            { t: 30, s: [105, 105], e: [100, 100] },
            { t: 60, s: [100, 100] },
          ],
        },
      },
      shapes: [
        { ty: "el", s: { a: 0, k: [50, 50] }, p: { a: 0, k: [0, 0] } },
        { ty: "st", c: { a: 0, k: [0, 0.886, 0.71, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 4 } },
        { ty: "fl", c: { a: 0, k: [0, 0.886, 0.71, 0.1] }, o: { a: 0, k: 100 } },
      ],
    },
    {
      ty: 4,
      nm: "hour",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: {
          a: 1,
          k: [
            { t: 0, s: [0], e: [360] },
            { t: 60, s: [360] },
          ],
        },
        p: { a: 0, k: [50, 50] },
      },
      shapes: [
        {
          ty: "sh",
          ks: {
            a: 0,
            k: {
              c: false,
              v: [
                [0, 0],
                [0, -12],
              ],
            },
          },
        },
        { ty: "st", c: { a: 0, k: [0, 0.886, 0.71, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 4 }, lc: 2 },
      ],
    },
    {
      ty: 4,
      nm: "minute",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: {
          a: 1,
          k: [
            { t: 0, s: [0], e: [720] },
            { t: 60, s: [720] },
          ],
        },
        p: { a: 0, k: [50, 50] },
      },
      shapes: [
        {
          ty: "sh",
          ks: {
            a: 0,
            k: {
              c: false,
              v: [
                [0, 0],
                [0, -18],
              ],
            },
          },
        },
        { ty: "st", c: { a: 0, k: [0, 0.886, 0.71, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 3 }, lc: 2 },
      ],
    },
  ],
}

const doctorAnimation = {
  v: "5.7.4",
  fr: 30,
  ip: 0,
  op: 60,
  w: 100,
  h: 100,
  layers: [
    {
      ty: 4,
      nm: "body",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        p: { a: 0, k: [50, 70] },
        s: { a: 0, k: [100, 100] },
      },
      shapes: [
        { ty: "rc", d: 1, s: { a: 0, k: [40, 35] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 8 } },
        { ty: "fl", c: { a: 0, k: [0.024, 0.714, 0.831, 1] }, o: { a: 0, k: 100 } },
      ],
    },
    {
      ty: 4,
      nm: "head",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        p: {
          a: 1,
          k: [
            { t: 0, s: [50, 35], e: [50, 32] },
            { t: 15, s: [50, 32], e: [50, 38] },
            { t: 30, s: [50, 38], e: [50, 32] },
            { t: 45, s: [50, 32], e: [50, 35] },
            { t: 60, s: [50, 35] },
          ],
        },
        s: { a: 0, k: [100, 100] },
      },
      shapes: [
        { ty: "el", s: { a: 0, k: [28, 28] }, p: { a: 0, k: [0, 0] } },
        { ty: "fl", c: { a: 0, k: [0.961, 0.882, 0.78, 1] }, o: { a: 0, k: 100 } },
      ],
    },
    {
      ty: 4,
      nm: "stethoscope",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: {
          a: 1,
          k: [
            { t: 0, s: [0], e: [5] },
            { t: 30, s: [5], e: [0] },
            { t: 60, s: [0] },
          ],
        },
        p: { a: 0, k: [50, 65] },
        s: { a: 0, k: [100, 100] },
      },
      shapes: [
        { ty: "el", s: { a: 0, k: [12, 12] }, p: { a: 0, k: [0, 10] } },
        { ty: "st", c: { a: 0, k: [0.2, 0.2, 0.2, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 2 } },
      ],
    },
  ],
}

const lockAnimation = {
  v: "5.7.4",
  fr: 30,
  ip: 0,
  op: 60,
  w: 100,
  h: 100,
  layers: [
    {
      ty: 4,
      nm: "body",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        p: { a: 0, k: [50, 58] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [100, 100], e: [105, 105] },
            { t: 30, s: [105, 105], e: [100, 100] },
            { t: 60, s: [100, 100] },
          ],
        },
      },
      shapes: [
        { ty: "rc", d: 1, s: { a: 0, k: [40, 35] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 6 } },
        { ty: "fl", c: { a: 0, k: [0, 0.886, 0.71, 1] }, o: { a: 0, k: 100 } },
      ],
    },
    {
      ty: 4,
      nm: "shackle",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        p: { a: 0, k: [50, 35] },
        s: { a: 0, k: [100, 100] },
      },
      shapes: [
        {
          ty: "sh",
          ks: {
            a: 0,
            k: {
              c: false,
              v: [
                [-12, 10],
                [-12, -5],
                [12, -5],
                [12, 10],
              ],
            },
          },
        },
        { ty: "st", c: { a: 0, k: [0, 0.886, 0.71, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 5 }, lc: 2, lj: 2 },
      ],
    },
    {
      ty: 4,
      nm: "keyhole",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        p: { a: 0, k: [50, 58] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [100, 100], e: [120, 120] },
            { t: 10, s: [120, 120], e: [100, 100] },
            { t: 20, s: [100, 100] },
          ],
        },
      },
      shapes: [
        { ty: "el", s: { a: 0, k: [10, 10] }, p: { a: 0, k: [0, -3] } },
        { ty: "fl", c: { a: 0, k: [0.04, 0.06, 0.11, 1] }, o: { a: 0, k: 100 } },
      ],
    },
  ],
}

interface AnimatedIconProps {
  type: "medCert" | "pill" | "referral" | "pathology" | "clock" | "doctor" | "lock"
  className?: string
  size?: number
}

export function AnimatedIcon({ type, className = "", size = 56 }: AnimatedIconProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<AnimationItem | null>(null)
  const [isHovered, setIsHovered] = useState(false)

  const animations = {
    medCert: medCertAnimation,
    pill: pillAnimation,
    referral: referralAnimation,
    pathology: pathologyAnimation,
    clock: clockAnimation,
    doctor: doctorAnimation,
    lock: lockAnimation,
  }

  useEffect(() => {
    if (!containerRef.current) return

    animationRef.current = lottie.loadAnimation({
      container: containerRef.current,
      renderer: "svg",
      loop: true,
      autoplay: true,
      animationData: animations[type],
    })

    return () => {
      animationRef.current?.destroy()
    }
  }, [type])

  useEffect(() => {
    if (animationRef.current) {
      animationRef.current.setSpeed(isHovered ? 1.5 : 1)
    }
  }, [isHovered])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: size, height: size }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    />
  )
}

export function MedCertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="9" y1="7" x2="15" y2="7" strokeLinecap="round" />
    </svg>
  )
}

export function PillIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M10.5 3.5a7 7 0 0 1 9.9 9.9l-6.4 6.4a7 7 0 0 1-9.9-9.9l6.4-6.4z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="7.5" y1="16.5" x2="16.5" y2="7.5" strokeLinecap="round" />
    </svg>
  )
}

export function ReferralIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4m0 12v4M2 12h4m12 0h4" strokeLinecap="round" />
      <path
        d="M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function ImagingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="12" cy="12" r="4" />
      <path d="M3 9h3m12 0h3M12 3v3m0 12v3" strokeLinecap="round" />
    </svg>
  )
}
