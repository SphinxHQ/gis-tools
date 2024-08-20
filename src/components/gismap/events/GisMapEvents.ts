import { GisEvent } from "~/composables/eventBus";
import * as GeoJSON from 'geojson';
import { Ref } from "vue";
export const Types = {
    DRAWTOOL: "map-event:draw-tool",
    CLEANDRAW: "map-event:clean-draw",
    DRAWEND: "map-event:draw-end",
    NOTIFY: "map-event:notify",
    ADD_FEATURES: "map-event:add-features",
}


export class GisMapDrawEvent extends GisEvent {
    constructor(params: {
        type: ('Polygon' | 'Point' | 'LineString' | 'None'),
        cleanBefore: Ref<boolean> | boolean,
        once: Ref<boolean> | boolean,
        keep: Ref<boolean> | boolean,
    }) {
        super(Types.DRAWTOOL,{}, params);
    }
}


export class GisMapCleanDrawEvent extends GisEvent {
    constructor() {
        super(Types.CLEANDRAW, {});
    }
}


export class GisMapDrawEndEvent extends GisEvent {
    constructor(data: any) {
        super(Types.DRAWEND,{}, data);
    }
}

export class GisMapNotifyEvent extends GisEvent {
    constructor(...datas: any[]) {
        super(Types.NOTIFY,{}, datas);
    }
}
export class GisMapAddFeaturesEvent extends GisEvent {
    constructor(features: GeoJSON.Feature[],options?:any) {
        super(Types.ADD_FEATURES,options, features);
    }
}



