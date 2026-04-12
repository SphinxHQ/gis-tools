import {ComponentInternalInstance} from "vue";

import EventBase from "~/event/EventBase";

export enum TipLevel{
    INFO,
    WARN,
    ERROR
}
export class TipLog{
    date: Date;
    level: TipLevel;
    name: string;
    message: string;
    constructor(level: TipLevel, name: string, message: string) {
        this.date = new Date();
        this.level = level;
        this.name = name;
        this.message = message;
    }
}
export class TipLogger extends EventBase{
    private componentInstance?: ComponentInternalInstance;
    private logs: TipLog[] = [];
    constructor(component?: ComponentInternalInstance) {
        super();
        this.componentInstance = component;
    }
    dispatchChange(tipLog: TipLog){
        this.dispatchEvent("change", tipLog)
    }
    log(level: TipLevel,name:string, message: string){
        const log = new TipLog(level, name, message);
        this.logs.push(log);
        this.dispatchChange(log);
    }

    info(name:string, message: string){
        this.log(TipLevel.INFO, name, message);
    }
    warn(name:string, message: string){
        this.log(TipLevel.WARN, name, message);
    }
    error(name:string, message: string){
        this.log(TipLevel.ERROR, name, message);
    }
    getLogs(): TipLog[]{
        return this.logs;
    }
}
