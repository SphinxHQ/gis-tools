/**
 * @file Logger utility
 * @description Provides leveled logging (info/warn/error/debug) with a unified prefix.
 *              Info and debug logs are only output in development mode.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-04-13
 */
/* eslint-disable no-console */
const LOG_PREFIX = '[GIS Tools]'

const isDev = import.meta.env.DEV

export const logger = {
    /**
     * Log informational messages (development mode only)
     * @param args - Messages to log
     */
    info(...args: unknown[]): void {
        if (isDev) {
            console.log(LOG_PREFIX, ...args)
        }
    },
    /**
     * Log warning messages (always output)
     * @param args - Warnings to log
     */
    warn(...args: unknown[]): void {
        console.warn(LOG_PREFIX, ...args)
    },
    /**
     * Log error messages (always output)
     * @param args - Errors to log
     */
    error(...args: unknown[]): void {
        console.error(LOG_PREFIX, ...args)
    },
    /**
     * Log debug messages (development mode only)
     * @param args - Debug messages to log
     */
    debug(...args: unknown[]): void {
        if (isDev) {
            console.debug(LOG_PREFIX, ...args)
        }
    },
}
