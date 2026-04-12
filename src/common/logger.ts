/* eslint-disable no-console */
const LOG_PREFIX = '[GIS Tools]'

const isDev = import.meta.env.DEV

export const logger = {
    info(...args: unknown[]): void {
        if (isDev) {
            console.log(LOG_PREFIX, ...args)
        }
    },
    warn(...args: unknown[]): void {
        console.warn(LOG_PREFIX, ...args)
    },
    error(...args: unknown[]): void {
        console.error(LOG_PREFIX, ...args)
    },
    debug(...args: unknown[]): void {
        if (isDev) {
            console.debug(LOG_PREFIX, ...args)
        }
    },
}
