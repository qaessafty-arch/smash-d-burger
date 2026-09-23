'use client'

import React from 'react'
import { Flame, Sparkles, Ban, Check } from 'lucide-react'

export type StockStatus = 'in-stock' | 'limited' | 'low-stock' | 'sold-out'

export interface StockInfo {
  count: number
  status: StockStatus
}

export function getStockInfo(count: number | undefined): StockInfo {
  if (count === undefined) {
    return { count: 15, status: 'in-stock' }
  }
  if (count <= 0) {
    return { count: 0, status: 'sold-out' }
  }
  if (count <= 3) {
    return { count, status: 'low-stock' }
  }
  if (count <= 6) {
    return { count, status: 'limited' }
  }
  return { count, status: 'in-stock' }
}

interface StockIndicatorProps {
  count: number | undefined
  lang?: 'EN' | 'KU' | 'AR'
  variant?: 'pill' | 'compact' | 'badge'
  showInStock?: boolean
  className?: string
}

export function StockIndicator({
  count,
  lang = 'EN',
  variant = 'pill',
  showInStock = false,
  className = '',
}: StockIndicatorProps) {
  const info = getStockInfo(count)

  if (info.status === 'in-stock' && !showInStock) {
    return null
  }

  // Multilingual labels
  const getLabels = () => {
    switch (info.status) {
      case 'sold-out':
        return {
          en: 'Sold Out',
          ku: 'تەواو بووە',
          ar: 'نفدت الكمية',
        }
      case 'low-stock':
        return {
          en: info.count === 1 ? 'Low Stock: 1 Left' : `Low Stock: ${info.count} Left`,
          ku: `کەم ماوە: تەنها ${info.count} ماوە`,
          ar: `كمية منخفضة: متبقي ${info.count}`,
        }
      case 'limited':
        return {
          en: `Limited: ${info.count} Left`,
          ku: `بەردەستبوونی دیاریکراو (${info.count})`,
          ar: `كمية محدودة (${info.count} متبقي)`,
        }
      case 'in-stock':
      default:
        return {
          en: `Fresh (${info.count})`,
          ku: `بەردەستە (${info.count})`,
          ar: `متوفر (${info.count})`,
        }
    }
  }

  const labels = getLabels()
  const labelText = lang === 'KU' ? labels.ku : lang === 'AR' ? labels.ar : labels.en

  if (variant === 'compact') {
    if (info.status === 'sold-out') {
      return (
        <span
          className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.5px] text-[#aaa] bg-[#171717] border border-white/20 px-1.5 py-0.5 rounded-[4px] select-none ${className}`}
        >
          <Ban size={10} className="text-[#888]" />
          <span>{labelText}</span>
        </span>
      )
    }

    if (info.status === 'low-stock') {
      return (
        <span
          className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.5px] text-[#D95B32] bg-[#ffe5dc] border border-[#D95B32]/40 px-1.5 py-0.5 rounded-[4px] select-none ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#D95B32] inline-block animate-pulse" />
          <span>{labelText}</span>
        </span>
      )
    }

    if (info.status === 'limited') {
      return (
        <span
          className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.5px] text-[#D9AA55] bg-[#171717] border border-[#D9AA55]/50 px-1.5 py-0.5 rounded-[4px] select-none ${className}`}
        >
          <Sparkles size={10} className="text-[#D9AA55]" />
          <span>{labelText}</span>
        </span>
      )
    }

    return (
      <span
        className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.5px] text-[#49675F] bg-[#f1e9de] border border-[#49675F]/30 px-1.5 py-0.5 rounded-[4px] select-none ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#49675F] inline-block" />
        <span>{labelText}</span>
      </span>
    )
  }

  // Default Pill Variant
  if (info.status === 'sold-out') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#171717] border border-white/20 text-[#aaa] text-[10px] font-bold uppercase tracking-[0.5px] select-none ${className}`}
        title="Sold out for today's service."
      >
        <Ban size={12} className="text-[#888] flex-shrink-0" />
        <span>{labelText}</span>
      </div>
    )
  }

  if (info.status === 'low-stock') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#ffe5dc] border border-[#D95B32]/40 text-[#D95B32] text-[10px] font-bold uppercase tracking-[0.5px] shadow-sm select-none ${className}`}
        title={`Only ${info.count} patties remaining in the kitchen.`}
      >
        <Flame size={12} className="text-[#D95B32] flex-shrink-0 fill-[#D95B32]" />
        <span>{labelText}</span>
      </div>
    )
  }

  if (info.status === 'limited') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#171717] border border-[#D9AA55]/50 text-[#D9AA55] text-[10px] font-bold uppercase tracking-[0.5px] select-none ${className}`}
        title="Limited batch made fresh daily."
      >
        <Sparkles size={12} className="text-[#D9AA55] flex-shrink-0" />
        <span>{labelText}</span>
      </div>
    )
  }

  // in-stock
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#f1e9de] border border-[#49675F]/30 text-[#49675F] text-[10px] font-bold uppercase tracking-[0.5px] select-none ${className}`}
    >
      <Check size={11} className="flex-shrink-0" />
      <span>{labelText}</span>
    </div>
  )
}
