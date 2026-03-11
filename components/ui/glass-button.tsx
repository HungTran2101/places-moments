'use client'

import * as React from 'react'

import type { VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

import { Button, type buttonVariants } from '@/components/ui/button'

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: VariantProps<typeof buttonVariants>['size']
  children: React.ReactNode
  className?: string
  asChild?: boolean
  primaryColor?: 'purple' | 'blue'
}

const glassColors = {
  purple: '209, 122, 255',
  blue: '102, 153, 255',
}

function GlassButton({ children,
  size,
  asChild = false,
  className,
  primaryColor = 'purple',
  ...props }: GlassButtonProps) {
  return (
    <Button
      size={size}
      asChild={asChild}
      style={{
        '--glass-color': glassColors[primaryColor]
      } as React.CSSProperties}
      className={cn(
        size === 'lg' && 'text-base has-[>svg]:px-6',
        'relative inline-flex shrink-0 rounded-lg !bg-transparent bg-clip-padding text-[rgb(var(--glass-color))]',

        // Glass effect
        `bg-gradient-to-l from-[rgba(var(--glass-color),0.15)] to-[rgba(var(--glass-color),0.25)] backdrop-blur-sm`,

        'before:pointer-events-none before:absolute before:inset-0 before:size-full before:rounded-[inherit] before:border before:border-transparent before:bg-origin-border',

        // Conic gradient
        `before:bg-[conic-gradient(from_var(--button-angle)_at_50%_50%,rgba(var(--glass-color),0.5),rgba(var(--glass-color),0)_10%_43%,rgba(var(--glass-color),0.5)_50%,rgba(var(--glass-color),0)_73%_93%,rgba(var(--glass-color),0.5))]`,

        //masking
        `before:p-[1px] before:[mask-image:linear-gradient(rgb(var(--glass-color))_0_0),linear-gradient(rgb(var(--glass-color))_0_0)] before:[mask-composite:exclude] before:[mask-clip:content-box,border-box]`,

        // Hover
        'before:[transition-property:_--button-angle] before:duration-500 before:ease-in-out hover:before:[--button-angle:-125deg]',

        className
      )}
      {...props}
    >
      {children}
    </Button>
  )
}

export { GlassButton, type GlassButtonProps }
