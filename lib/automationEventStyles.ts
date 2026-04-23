/**
 * Unleashed-style palette for automation log UI: primary (magenta), secondary (neon yellow), zinc (neutral).
 * Used by order detail timeline + Events table pills.
 */
export const AUTOMATION_EVENT_CARD: Record<string, string> = {
  // Lift-off: yellow
  order_run_start:
    "border-l-secondary bg-secondary/30 dark:border-l-secondary dark:bg-secondary/15",
  // FireSprint checkout: brand pink
  order_checkout_start:
    "border-l-primary bg-primary/10 dark:border-l-primary dark:bg-primary/15",
  // Run finished (success path): pink → yellow wash
  order_run_end:
    "border-l-primary bg-gradient-to-r from-primary/15 to-secondary/35 dark:from-primary/20 dark:to-secondary/10",
  // Neutral system snapshots
  queue_snapshot:
    "border-l-zinc-300 bg-zinc-100/90 dark:border-l-zinc-500 dark:bg-zinc-800/55",
  // Incoming store signal: warm yellow
  woo_webhook:
    "border-l-secondary bg-secondary/25 dark:border-l-secondary dark:bg-secondary/12",
  // Shipment sync (global job; same order may still see these on rare joins)
  firesprint_sync_start:
    "border-l-secondary bg-secondary/30 dark:border-l-secondary dark:bg-secondary/15",
  firesprint_sync_step:
    "border-l-primary/80 bg-primary/5 dark:border-l-primary/70 dark:bg-primary/10",
  firesprint_sync_end:
    "border-l-primary bg-primary/12 dark:border-l-primary dark:bg-primary/18",
}

export const AUTOMATION_EVENT_PILL: Record<string, string> = {
  order_run_start:
    "bg-secondary/40 text-foreground border border-secondary/50 dark:bg-secondary/20 dark:border-secondary/40",
  order_checkout_start:
    "bg-primary/20 text-foreground border border-primary/35 dark:bg-primary/30 dark:text-primary-foreground dark:border-primary/25",
  order_run_end:
    "bg-gradient-to-r from-primary/20 to-secondary/35 text-foreground border border-primary/30 dark:from-primary/25 dark:to-secondary/15",
  queue_snapshot:
    "bg-zinc-200/90 text-zinc-800 dark:bg-zinc-700/80 dark:text-zinc-200",
  woo_webhook:
    "bg-secondary/35 text-foreground border border-secondary/45 dark:bg-secondary/18",
  firesprint_sync_start:
    "bg-secondary/40 text-foreground border border-secondary/50 dark:bg-secondary/20",
  firesprint_sync_step:
    "bg-primary/15 text-foreground border border-primary/30 dark:bg-primary/25 dark:text-primary-foreground",
  firesprint_sync_end:
    "bg-primary/20 text-foreground border border-primary/35 dark:bg-primary/30 dark:text-primary-foreground",
}

export const AUTOMATION_EVENT_CARD_FALLBACK =
  "border-l-zinc-300 bg-zinc-100/80 dark:border-l-zinc-600 dark:bg-zinc-800/50"

export const AUTOMATION_EVENT_PILL_FALLBACK =
  "bg-zinc-200/90 text-zinc-800 dark:bg-zinc-700/80 dark:text-zinc-200"
