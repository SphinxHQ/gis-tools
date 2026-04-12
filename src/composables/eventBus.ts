import Common from "~/common/Common";
import {logger} from "~/common/logger";

export class GisEvent {
    event_id: string;
    event_type: string;
    hasCallBack: boolean = true;
    options: unknown;
    params?: unknown[];
    constructor( eventType: string, options: unknown, ...params: unknown[] ) {
        this.event_id = Common.uuid();
        this.event_type = eventType;
        this.options = options;
        this.params = params;
    }
}
export class EventPromise{
    promise: Promise<PromiseSettledResult<unknown>[]>;
    handlerResolve: (value: PromiseSettledResult<unknown>[]) => void = () => {};
    handlerReject: (reason?: unknown) => void = () => {};
    constructor(){
        this.promise = new Promise((resolve,reject)=>{
            this.handlerResolve = resolve;
            this.handlerReject = reject;
        })
    }
}
export class GisEventBus {
    schema: string;
    listeners: Map<string, Map<string, Function[]>> = new Map();
    constructor(schema: string) {
        this.schema = schema;
    }
    getListeners(group:string, event:string):Function[]{
        if(!this.listeners.has(group)){
            this.listeners.set(group,new Map<string, Function[]>());
        }
        if(!this.listeners.get(group)!.has(event)){
            this.listeners.get(group)!.set(event,[]);
        }
        return this.listeners.get(group)!.get(event)!;
    }
    on(group: string, event: string, callback: Function):void{
        const ls = this.getListeners(group,event);
        if(ls.includes(callback)){
            throw new Error('重复注册事件');
        }
        ls.push(callback);
    }
    emit(group:string,gisEvent:GisEvent):Promise<PromiseSettledResult<unknown>[]>{
        const event = gisEvent.event_type
        const params = gisEvent.params;
        const options = gisEvent?.options;
        return  this.dispatch(group,event,options,...params|| [])
    }
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
    off(group:string, event:string,callback?:Function){
        const ls = this.getListeners(group,event);
        if(callback && ls.includes(callback)){
            ls.splice(ls.indexOf(callback),1);
        }
        if(callback===undefined){
            ls.splice(0);
        }
    }
    log(group:string,...args:unknown[]){
        this.dispatch(group,'console-log',args)
    }
}
const gisEventBus = new GisEventBus('sys');

export const eventBus = gisEventBus;
