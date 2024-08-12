import { ca, tr } from "element-plus/es/locale";
import { getMaxListeners } from "events";
import { resolve } from "path";
import { off } from "process";
import { TinyEmitter } from "tiny-emitter";
import Common from "~/common/Common";

const emiiter = new TinyEmitter();


export class GisEvent {
    event_id: string;
    event_type: string;
    hasCallBack: boolean = true;
    options: any;
    params?: any[];
    constructor( eventType: string, options:any,...params:any[] ) {
        this.event_id = Common.uuid();
        this.event_type = eventType;
        this.options = options;
        this.params = params;
    }
}
export class EventPromise{
    promise:Promise<any>;
    handlerResolve:Function = _=>{};
    handlerReject:Function= _=>{};
    constructor(){
        this.promise = new Promise((resolve,reject)=>{
            this.handlerResolve = resolve;
            this.handlerReject = reject;
        })
    }
}
class GisEventBus {
    emiiter: TinyEmitter;
    schema: string;
    listeners: Map<string, Function[]>= new Map();
    constructor(schema: string) {
        this.emiiter = new TinyEmitter();
        this.schema = schema; 
    }
    getListeners(event:string):Function[]{
        let listeners = this.listeners.get(event);
        if(!listeners){
            listeners = []
            this.listeners.set(event,listeners)
        }
        return listeners;
    }
    on(event: string, callback: Function, ctx?: any):void{
        this.log(arguments);
        const ls = this.getListeners(event);
        if(ls.includes(callback)){
            throw new Error('重复注册事件');
        }
        ls.push(callback);
    }
    emit(gisEvent:GisEvent):Promise<{status:('fulfilled'|'rejected'),reason?:number,value?:number}[]>{
        const event = gisEvent.event_type
        const params = gisEvent.params;
        return  this.dispatch(event,...params|| [])
    }
    protected  dispatch(event:string,...args:any[]):Promise<any[]>{
        console.log(`------------dispatch:${event}---------`)
        const ls = this.getListeners(event);
        const eps =  new EventPromise(); 
        const ps = ls.map(cb=>new Promise((resolve,reject)=>{
            setTimeout(async ()=>{
                try{
                    const res = await Reflect.apply(cb,this,args);
                    resolve(res);
                }catch(err){
                    console.error(err)
                    reject(err);
                }
            },0)
        }))
        Promise.allSettled(ps).then(res=>{
            eps.handlerResolve(res);
        }).catch(err=>{
            console.error(err);
            eps.handlerReject(err);
        })
        return  eps.promise;
    }
    off(event:string,callback?:Function){
        emiiter.off(event,callback)
    }
    log(...args:any[]){
        if(process.env.NODE_ENV === 'development'){
            Reflect.apply(console.log,console,args)
        }
        this.dispatch('console-log',args)
    }
}
const gisEventBus = new GisEventBus('sys');
 


export const eventBus = gisEventBus;