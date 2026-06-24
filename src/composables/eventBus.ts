/**
 * @file Event bus
 * @description Provides a grouped event bus system with promise-based dispatch.
 *              Events are organized by group and event type, supporting on/emit/off
 *              operations with settled result aggregation.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2024-08-06
 */
import Common from "~/common/Common";
import {logger} from "~/common/logger";

/**
 * Represents a GIS event with unique id, type, options, and optional params
 */
export class GisEvent {
    /** Unique event identifier */
    event_id: string;
    /** Event type string */
    event_type: string;
    /*
    /** Whether the event expects a callback *\/
    hasCallBack: boolean = true;
    */
    /** Event options payload */
    options: unknown;
    /** Additional event parameters */
    params?: unknown[];
    /**
     * Create a GisEvent
     * @param eventType - Event type string
     * @param options - Event options
     * @param params - Additional parameters
     */
    constructor( eventType: string, options: unknown, ...params: unknown[] ) {
        this.event_id = Common.uuid();
        this.event_type = eventType;
        this.options = options;
        this.params = params;
    }
}
/*
 * Promise wrapper for aggregating settled results from event dispatch
 *
export class EventPromise{
    /* The aggregated promise of all settled results *\/
    promise: Promise<PromiseSettledResult<unknown>[]>;
    /* Resolve handler *\/
    handlerResolve: (value: PromiseSettledResult<unknown>[]) => void = () => {};
    /* Reject handler *\/
    handlerReject: (reason?: unknown) => void = () => {};
    constructor(){
        this.promise = new Promise((resolve,reject)=>{
            this.handlerResolve = resolve;
            this.handlerReject = reject;
        })
    }
}
*/
/**
 * Grouped event bus supporting on/emit/off with promise-based dispatch
 */
export class GisEventBus {
    /** Schema namespace for the bus */
    schema: string;
    /** Nested map: group → event → callbacks */
    listeners: Map<string, Map<string, Function[]>> = new Map();
    /**
     * Create a GisEventBus
     * @param schema - Namespace schema for the bus
     */
    constructor(schema: string) {
        this.schema = schema;
    }
    /**
     * Get the callback array for a group/event pair, creating maps as needed
     * @param group - Event group
     * @param event - Event type
     * @returns Array of callback functions
     */
    getListeners(group:string, event:string):Function[]{
        if(!this.listeners.has(group)){
            this.listeners.set(group,new Map<string, Function[]>());
        }
        if(!this.listeners.get(group)!.has(event)){
            this.listeners.get(group)!.set(event,[]);
        }
        return this.listeners.get(group)!.get(event)!;
    }
    /**
     * Register a callback for a group/event
     * @param group - Event group
     * @param event - Event type
     * @param callback - Function to call when event is emitted
     * @throws {Error} When the callback is already registered
     */
    on(group: string, event: string, callback: Function):void{
        const ls = this.getListeners(group,event);
        if(ls.includes(callback)){
            throw new Error('重复注册事件');
        }
        ls.push(callback);
    }
    /**
     * Emit a GisEvent to all listeners in the group
     * @param group - Event group
     * @param gisEvent - The event to emit
     * @returns Promise of settled results from all callbacks
     */
    emit(group:string,gisEvent:GisEvent | { event_type: string; options: unknown; params?: unknown[] }):Promise<PromiseSettledResult<unknown>[]>{
        const event = gisEvent.event_type
        const params = gisEvent.params;
        const options = gisEvent?.options;
        return  this.dispatch(group,event,options,...params|| [])
    }
    /**
     * Dispatch an event to all registered callbacks
     * @param group - Event group
     * @param event - Event type
     * @param options - Event options
     * @param args - Additional arguments
     * @returns Promise of settled results (never rejects, errors become rejected results)
     */
    protected dispatch(group:string, event:string, options?:unknown,...args:unknown[]):Promise<PromiseSettledResult<unknown>[]>{
        const ls = this.getListeners(group,event);
        const ps = ls.map(cb => new Promise<PromiseSettledResult<unknown>>((resolve) => {
            setTimeout(async () => {
                try {
                    const res = await Reflect.apply(cb, this, [options, ...args]);
                    resolve({ status: 'fulfilled', value: res });
                } catch(err) {
                    logger.error('EventBus dispatch error:', err);
                    resolve({ status: 'rejected', reason: err });
                }
            }, 0);
        }));
        return Promise.all(ps);
    }
    /**
     * Remove a callback (or all callbacks) for a group/event
     * @param group - Event group
     * @param event - Event type
     * @param callback - Specific callback to remove, or undefined to remove all
     */
    off(group:string, event:string,callback?:Function){
        const ls = this.getListeners(group,event);
        if(callback && ls.includes(callback)){
            ls.splice(ls.indexOf(callback),1);
        }
        if(callback===undefined){
            ls.splice(0);
        }
    }
    /**
     * Log a message via the console-log event in the group
     * @param group - Event group
     * @param args - Arguments to log
     */
    log(group:string,...args:unknown[]){
        this.dispatch(group,'console-log',args)
    }
}
const gisEventBus = new GisEventBus('sys');

export const eventBus = gisEventBus;
