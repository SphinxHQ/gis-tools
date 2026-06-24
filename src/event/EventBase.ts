/**
 * @file Event base class
 * @description Base event class providing event dispatch and listener management.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-04-13
 */
import {logger} from "~/common/logger";

/** Base event class with dispatch and listener management */
export default class EventBase {
    /** Map of event name to registered callback list */
    protected listeners: Map<string, Function[]>;

    constructor() {
        this.listeners = new Map<string, Function[]>();
    }

    /**
     * Get or create the listener array for an event name
     * @param eventName - Event name to look up
     * @returns Array of registered callbacks
     */
    protected getlisteners(eventName: string): Function[] {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }
        return this.listeners.get(eventName)!;
    }

    /**
     * Dispatch an event to all registered listeners
     * @param eventName - Event name to dispatch
     * @param args - Arguments to pass to each listener
     */
    protected dispatchEvent(eventName: string, ...args: unknown[]) {
        this.getlisteners(eventName).forEach(listener => {
            Reflect.apply(listener, this, args)
        })
    }

    /**
     * Register a callback for an event
     * @param eventName - Event name to listen to
     * @param eventCallBack - Callback function
     */
    on(eventName: string, eventCallBack: (...args: unknown[]) => void) {
        const listenerList = this.getlisteners(eventName);
        if (!listenerList.includes(eventCallBack)) {
            listenerList.push(eventCallBack);
        } else {
            logger.warn(`${eventName} event listener is already registered`);
        }
    }

    /**
     * Remove a callback (or all callbacks) for an event
     * @param eventName - Event name
     * @param eventCallBack - Specific callback to remove, or undefined to remove all
     */
    off(eventName: string, eventCallBack?: Function) {
        const listenerList = this.getlisteners(eventName);
        if (eventCallBack) {
            const index = listenerList.indexOf(eventCallBack);
            if (index >= 0) {
                listenerList.splice(index, 1);
            }
        } else {
            logger.warn(`${eventName} event listeners is already removed`);
            listenerList.splice(0, listenerList.length);
        }
    }

    /** Remove all event listeners */
    clear() {
        this.listeners.clear();
    }
}
