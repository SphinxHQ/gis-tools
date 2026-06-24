/**
 * @file Event base class
 * @description Base event class providing event dispatch and listener management.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-04-13
 */
import {logger} from "~/common/logger";

export default class EventBase {
    protected listeners: Map<string, Function[]>;

    constructor() {
        this.listeners = new Map<string, Function[]>();
    }

    protected getlisteners(eventName: string): Function[] {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }
        return this.listeners.get(eventName)!;
    }

    protected dispatchEvent(eventName: string, ...args: unknown[]) {
        this.getlisteners(eventName).forEach(listener => {
            Reflect.apply(listener, this, args)
        })
    }

    on(eventName: string, eventCallBack: (...args: unknown[]) => void) {
        const listenerList = this.getlisteners(eventName);
        if (!listenerList.includes(eventCallBack)) {
            listenerList.push(eventCallBack);
        } else {
            logger.warn(`${eventName} event listener is already registered`);
        }
    }

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

    clear() {
        this.listeners.clear();
    }
}
